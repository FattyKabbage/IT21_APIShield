import { ApiGatewayService } from './api-gateway.service.js';

describe('ApiGatewayService', () => {
  let service: ApiGatewayService;

  beforeEach(() => {
    service = new ApiGatewayService({} as never, {} as never, {} as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});