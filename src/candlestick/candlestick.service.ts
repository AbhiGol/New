/* eslint-disable prettier/prettier */
// candlestick.service.ts
import { Injectable } from '@nestjs/common';
import { CandlestickGateway } from './candlestick.gateway';
import * as WebSocket from 'ws';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { DatabaseService } from '../provider/database.provider';
import { MongoClient } from 'mongodb';
import { BinanceService } from '../binance/binance.service';


@Injectable()
export class CandlestickService {
    private ws: WebSocket;
    private wps: WebSocket;
    private candlesticks: any[] = [];
    private signals: any[] = [];
    private recordedData =[];
    private csvFilePath: string;
    private csvWriter: any;
    last_time = null;
    count = 0;
    signal_count = 0;
    private lastSignal = null;
    lastMinute = 0;

    private dbClient: MongoClient;

    constructor(private readonly databaseService: DatabaseService,
        private readonly candlestickGateway: CandlestickGateway,
        private readonly binanceService: BinanceService,
    ) {
        this.initializeCsvWriter();
        this.csvFilePath = 'signals.csv';
    }


    async onModuleInit() {
        try {
            this.dbClient = this.databaseService.getClient();
            console.log('Database client initialized');
        } catch (error) {
            console.error('Error initializing database client:', error.message);
        }
        this.startFetchingData();
    }


    initializeCsvWriter() {
        this.csvWriter = createObjectCsvWriter({
            path: 'signals.csv',
            header: [
                { id: 'time', title: 'Time' },
                { id: 'open', title: 'Open' },
                { id: 'high', title: 'High' },
                { id: 'low', title: 'Low' },
                { id: 'close', title: 'Close' }
            ]
        });
    }


    async startFetchingData() {
        const symbol = 'btcusdt'; // Example symbol
        const interval = '15m'; // Example interval (1 minute)
        //const wsUrl = `wss://fstream.binance.com/ws/${symbol}@kline_${interval}`;
        const wsUrl = `wss://fstream.binance.com/ws/${symbol}@kline_${interval}`;
        const wsPriceUrl = 'wss://fstream.binancefuture.com/ws/btcusdt@markPrice@1s'

        this.ws = new WebSocket(wsUrl);
        this.wps = new WebSocket(wsPriceUrl);

        this.ws.on('open', () => {
            console.log('WebSocket connected');
        });

        this.ws.on('message', async (data: string) => {
            const candlestickData = JSON.parse(data);
            const processedData = {
                t: new Date(candlestickData.k.t),
                o: parseFloat(candlestickData.k.o),
                h: parseFloat(candlestickData.k.h),
                l: parseFloat(candlestickData.k.l),
                c: parseFloat(candlestickData.k.c)
            };
            this.candlesticks.push(processedData);
        //this.writeToCSV(processedData.t,processedData.o,processedData.h,processedData.l,processedData.c);
        // Check if a new minute has started (based on timestamp)
            const currentMinute = processedData.t.getMinutes();
            //let lastMinute = 0;
            if (this.lastMinute !== currentMinute && currentMinute !== 0) {
                this.lastMinute = currentMinute;
                // Calculate Supertrend whenever a new minute starts
                this.writeToCSV();
                //this.calculateSupertrend(this.candlesticks);
                this.calculateSupertrendFromCSV();
            }
            this.candlestickGateway.server.emit('candlestickData', processedData);
            this.saveCandlestickData(processedData);   // save in database
        });

        this.ws.on('close', () => {
            console.log('WebSocket disconnected');
            setTimeout(() => {
                this.startFetchingData();
            }, 1000); // Reconnect after 1 seconds
        });

        this.ws.on('error', (error: Error) => {
            console.error('WebSocket error:', error.message);
        });

        this.wps.on('open', () => {
            console.log('Price WebSocket connected');
        });

        this.wps.on('message', (data: string) => {
            const tradeData = JSON.parse(data);
            const processedData = {
                p: parseFloat(tradeData.p) // Price of the trade
            };
            this.candlestickGateway.server.emit('livePrice', processedData);
        });

        this.wps.on('close', () => {
            console.log('Price WebSocket disconnected');
            setTimeout(() => {
                this.startFetchingData();
            }, 1000); // Reconnect after 1 seconds
        });

        this.wps.on('error', (error: Error) => {
            console.error('Price WebSocket error:', error.message);
        });
    }


    async writeToCSV() {
        if (this.candlesticks.length === 0) {
            return; // No data available
        }
        const lastMinuteData = this.candlesticks.filter(data => data.t.getMinutes() === this.lastMinute - 1);
        
        const lastCandlestick = lastMinuteData[lastMinuteData.length - 1];
        if (!lastCandlestick) {
            return; // No data for the last minute available
        }
        const newRow = `${new Date(lastCandlestick.t)},${lastCandlestick.o},${lastCandlestick.h},${lastCandlestick.l},${lastCandlestick.c}\n`;
        try {
            fs.appendFileSync('signals.csv', newRow);
            // Store the data in the array
            this.recordedData.push({
                t: new Date(lastCandlestick.t),
                o: lastCandlestick.o,
                h: lastCandlestick.h,
                l: lastCandlestick.l,
                c: lastCandlestick.c
            });
            console.log("array",this.recordedData);
            this.candlestickGateway.server.emit('newCandle', this.recordedData);
            console.log('Last entry of the previous minute written to CSV:', newRow);
        } catch (error) {
            console.error('Error writing to CSV:', error);
        }
    }


    async calculateSupertrendFromCSV() {
        this.getSupertrend();
    }


    readCSV(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(this.csvFilePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => {resolve(results.map(data => ({
                    t: new Date(data.Time),
                    o: parseFloat(data.Open),
                    h: parseFloat(data.High),
                    l: parseFloat(data.Low),
                    c: parseFloat(data.Close)
                })));})
                .on('error', (error) => reject(error));
        });
    }


    // Calculate Supertrend
    calculateSupertrend(data: any[], period = 10, multiplier = 3) {
        const df = data.map(d => ({
            time: new Date(d.t),
            open: d.o,
            high: d.h,
            low: d.l,
            close: d.c,
        }));

        const tr = df.map((d, i) => {
            if (i === 0) return 0;
            const highLow = d.high - d.low;
            const highClose = Math.abs(d.high - df[i - 1].close);
            const lowClose = Math.abs(d.low - df[i - 1].close);
            return Math.max(highLow, highClose, lowClose);
        });

        const atr = tr.map((_, i) => {
            if (i < period - 1) return 0;
            const sum = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            return sum / period
        });

        const upperband = [];
        const lowerband = [];
        const inUptrend = new Array(df.length).fill(true);

        for (let i = 0; i < df.length; i++) {
            const middleBand = (df[i].high + df[i].low) / 2;
            upperband.push(middleBand + multiplier * atr[i]);
            lowerband.push(middleBand - multiplier * atr[i]);

            if (i === 0) continue;

            if (df[i].close > upperband[i - 1]) {
                inUptrend[i] = true;
            } else if (df[i].close < lowerband[i - 1]) {
                inUptrend[i] = false;
            } else {
                inUptrend[i] = inUptrend[i - 1];
                if (inUptrend[i]) {
                    lowerband[i] = Math.max(lowerband[i], lowerband[i - 1]);
                } else {
                    upperband[i] = Math.min(upperband[i], upperband[i - 1]);
                }
            }
        }
        const supertrend = inUptrend.map((trend, i) => (trend ? lowerband[i] : upperband[i]));

        return { supertrend, inUptrend };
    }


    async getSupertrend() {
        //const data = await this.readCSV();
        const data = await this.recordedData;
        const { inUptrend } = this.calculateSupertrend(data);

        const signals = [];
        const dbsignals = [];
        for (let i = 1; i < inUptrend.length -1 ; i++) {
            if (inUptrend[i] && !inUptrend[i - 1]) {
                const newSignal = { signal: 'Buy', open_time: new Date(data[i+1].t), low: data[i+1].l, signal_time: Date.now()};
                //this.binanceService.placeMarketOrder("BTCUSDT", "BUY", 0.01);
            if (!this.lastSignal || this.lastSignal.type !== newSignal.signal || this.lastSignal.date !== newSignal.open_time) {
                this.lastSignal = newSignal;
                //this.logSignalToCsv(this.signalPath, "Buy", newSignal.open_time, newSignal.open, newSignal.high, newSignal.low, newSignal.close, newSignal.open);
                signals.push(newSignal);

                dbsignals.push(newSignal);
            }
            } else if (!inUptrend[i] && inUptrend[i - 1]) {
                const newSignal = { signal: 'Sell', open_time: new Date(data[i+1].t), high: data[i+1].h, signal_time: Date.now()};
                //this.binanceService.placeMarketOrder("BTCUSDT", "SELL", 0.01);
                if (!this.lastSignal || this.lastSignal.type !== newSignal.signal || this.lastSignal.date !== newSignal.open_time) {
                this.lastSignal = newSignal;
                //this.logSignalToCsv(this.signalPath, "Sell", newSignal.open_time, newSignal.open, newSignal.high, newSignal.low, newSignal.close, newSignal.close);
                signals.push(newSignal);
                dbsignals.push(newSignal);
                }
            }
        }


        // Save signals to MongoDB
        if (dbsignals.length > 0) {
            if(dbsignals.length >= 2){
                console.log("here");
                const first = dbsignals[dbsignals.length - 2];
                const second = dbsignals[dbsignals.length - 1];

                if(first.signal == "Sell"){
                    const profit = first.high - second.low;
                    console.log("Sellprofit:",profit);
                    second.profit_or_loss = profit;
                }
                if(first.signal == "Buy"){
                    const profit = second.high - first.low;
                    console.log("Buyprofit:",profit);
                    second.profit_or_loss = profit;
                }
                await this.saveSignalData(dbsignals);
            }
            else{
            await this.saveSignalData(dbsignals);
            }
        }
        //await this.calculateProfit(this.signalPath, this.profitLossPath);
        console.log("signals",signals);
        this.candlestickGateway.server.emit('signals', signals);
        return signals;
    }


    // Save candlestrick data in mongodb
    async saveCandlestickData(data: any) {
        try {
            if (!this.dbClient) {
                throw new Error('Database client is not initialized');
            }
            const db = this.dbClient.db('trading_data');
            const collection = db.collection('candlestick_data');
            await collection.insertOne(data);
            //console.log('Candlestick data saved to MongoDB:', data);
        } catch (error) {
            //console.error('Error saving candlestick data to MongoDB:', error);
        }
    }


    // Save signal data in mongodb
    async saveSignalData(data: any) {
        try {
            if (!this.dbClient) {
                throw new Error('Database client is not initialized');
            }
            const db = this.dbClient.db('trading_data');
            const collection = db.collection('signals');
            for (const signal of data) {
                const existingSignal = await collection.findOne({ open_time: signal.open_time });
                if (!existingSignal) {
                    await collection.insertOne(signal);
                    //console.log('Signal saved to MongoDB:', signal);
                    const signal_type = (signal.signal).toUpperCase();
                    try{
                        //const avbl = this.binanceService.showbalances();
                        //console.log("balances",avbl);
                        if(signal_type !== "SELL" || this.signal_count >= 1){
                            //const orderResponse = this.binanceService.placeMarketOrder("BTCUSDT", signal_type, 0.03);
                            const orderResponse = this.binanceService.placeFullBalanceOrder("BTCUSDT", signal_type);   // Full balance order place
                            console.log('Order placed successfully:', orderResponse);
                            this.signal_count++;
                        }
                        //this.signal_count++;
                        //if(this.signal_count > 1){
                        //this.binanceService.placeMarketOrder("BTCUSDT", signal_type, 0.1);
                        //}
                    }
                    catch(error){
                        console.error('Error placing order:', error);
                    }
                } else {
                    //console.log('Duplicate signal found. Skipping:', signal);
                }
            }
            console.log('Signals data saved to MongoDB successfully');
        } catch (error) {
            console.error('Error saving signals data to MongoDB:', error);
        }
    }
}
