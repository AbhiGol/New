import { Test, TestingModule } from '@nestjs/testing';
import { CandlestickService } from './candlestick.service';

describe('CandlestickService', () => {
  let service: CandlestickService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CandlestickService],
    }).compile();

    service = module.get<CandlestickService>(CandlestickService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
