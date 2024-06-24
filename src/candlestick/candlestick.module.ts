/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
//import { MongooseModule } from '@nestjs/mongoose';
//import { Candlestick, CandlestickSchema } from './candlestick.schema';
//import { Signal, SignalSchema } from './signal.schema';
import { CandlestickService } from './candlestick.service';
import { CandlestickGateway } from './candlestick.gateway';
import { DatabaseModule } from 'src/provider/database.module';
import { BinanceService } from 'src/binance/binance.service';
import { BinanceModule } from 'src/binance/binance.module';

@Module({
    imports: [
        DatabaseModule,
        BinanceModule,
    ],
    providers: [CandlestickService, CandlestickGateway, BinanceService],
    exports: [CandlestickService],
})
export class CandlestickModule {}
