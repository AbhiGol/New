/* eslint-disable prettier/prettier */
import {  Controller, Post, Get, Query } from '@nestjs/common';
import { BinanceService } from './binance.service';

@Controller('binance')
export class BinanceController {
  constructor(private readonly binanceService: BinanceService) {}
  //const binanceService = app.get(BinanceService);

  @Post('place-order')
  async placeOrder() {
    try {
      const orderResponse = await this.binanceService.placeMarketOrder('BTCUSDT', 'BUY', 0.01);
      console.log('Order placed successfully:', orderResponse);
    } catch (error) {
      console.error('Error placing order:', error);
    }
  }

  @Post('place-full-balance-order')
  async placeFullBalanceOrder() {
    //return this.binanceService.placeFullBalanceOrder(symbol, side);
    try {
      const orderResponse = await this.binanceService.placeFullBalanceOrder('BTCUSDT', 'BUY');
      console.log('Order placed successfully:', orderResponse);
    } catch (error) {
      console.error('Error placing order:', error);
    }
  }

  @Get('balances')
  async getBalances() {
    return this.binanceService.getUSDTBalances();
  }

  @Get('fetch-balances')
  async fetch() {
    return this.binanceService.fetch();
  }

  @Get('order-history')
  async getOrderHistory(@Query('symbol') symbol: string) {
    return this.binanceService.getOrderHistory(symbol);
  }
}