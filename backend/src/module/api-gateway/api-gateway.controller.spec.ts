import { ApiGatewayController } from './api-gateway.controller.js';

describe('ApiGatewayController', () => {
  let controller: ApiGatewayController;

  beforeEach(() => {
    controller = new ApiGatewayController({} as never);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});