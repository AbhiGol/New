/* eslint-disable prettier/prettier */
// supertrend.ts

interface Kline {
    high: number;
    low: number;
    close: number;
  }
  
  export function calculateATR(data: Kline[], period: number): number[] {
    const trValues = [];
    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trValues.push(tr);
    }
  
    const atr = [];
    for (let i = 0; i < trValues.length - period + 1; i++) {
      atr.push(
        trValues.slice(i, i + period).reduce((a, b) => a + b) / period
      );
    }
    return atr;
  }

  export function calculateSupertrendWithSignals(data: Kline[], atrPeriod: number, multiplier: number): { supertrend: number[]; finalUpperBand: number[]; finalLowerBand: number[]; trend: boolean[]; signals: string[] } {
    const atr = calculateATR(data, atrPeriod);
    const supertrend = [];
    const finalUpperBand = [];
    const finalLowerBand = [];
    const trend = [];
    const signals = [];
  
    for (let i = atrPeriod - 1; i < data.length; i++) {
      const upperBand = (data[i].high + data[i].low) / 2 + multiplier * atr[i - atrPeriod + 1];
      const lowerBand = (data[i].high + data[i].low) / 2 - multiplier * atr[i - atrPeriod + 1];
  
      if (i === atrPeriod - 1) {
        supertrend.push(upperBand);
        trend.push(true);
        signals.push(''); // No signal initially
      } else {
        if (supertrend[supertrend.length - 1] === finalUpperBand[finalUpperBand.length - 1]) {
          if (data[i].close <= upperBand) {
            supertrend.push(upperBand);
            trend.push(true);
            signals.push(''); // No signal for buy
          } else {
            supertrend.push(lowerBand);
            trend.push(false);
            signals.push('SELL'); // Sell signal
          }
        } else {
          if (data[i].close >= lowerBand) {
            supertrend.push(lowerBand);
            trend.push(false);
            signals.push(''); // No signal for sell
          } else {
            supertrend.push(upperBand);
            trend.push(true);
            signals.push('BUY'); // Buy signal
          }
        }
      }
  
      finalUpperBand.push(upperBand);
      finalLowerBand.push(lowerBand);
    }
  
    return { supertrend, finalUpperBand, finalLowerBand, trend, signals };
  }
  