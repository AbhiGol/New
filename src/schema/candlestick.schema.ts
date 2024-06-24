/* eslint-disable prettier/prettier */
import * as mongoose from 'mongoose';

export const CandlestickSchema = new mongoose.Schema({
    t: Date,
    o: Number,
    h: Number,
    l: Number,
    c: Number,
});