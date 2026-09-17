// * NestJS 테스트 모듈 기능
import { Test, TestingModule } from '@nestjs/testing';

// * 테스트 대상 Controller
import { FaqsController } from './faqs.controller';

// * Controller가 호출하는 Service mock
import { FaqsService } from './faqs.service';

describe('FaqsController', () => {
  let controller: FaqsController;

  // * FaqsService mock
  const faqsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaqsController],
      providers: [
        {
          provide: FaqsService,
          useValue: faqsService,
        },
      ],
    }).compile();

    controller = module.get<FaqsController>(FaqsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /faqs', () => {
    it('FaqsService.findAll에 category를 전달한다', async () => {
      const faqs = [{ id: 'faq-1', question: 'Q', answer: 'A' }];
      faqsService.findAll.mockResolvedValue(faqs);

      await expect(controller.findAll('일반')).resolves.toEqual(faqs);
      expect(faqsService.findAll).toHaveBeenCalledWith('일반');
    });
  });
});
