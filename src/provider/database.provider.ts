/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { MongoClient } from 'mongodb';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private client: MongoClient;

  async onModuleInit() {
    this.client = new MongoClient('mongodb://localhost:27017/', {
      //useNewUrlParser: true,
      //useUnifiedTopology: true,
    });

    await this.client.connect();
    console.log('Connected to MongoDB');
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('MongoClient is not initialized');
    }
    return this.client;
  }

  closeConnection(): Promise<void> {
    return this.client.close();
  }
}

