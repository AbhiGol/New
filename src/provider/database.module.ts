import { Module } from '@nestjs/common';
import { DatabaseService } from './database.provider';

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
