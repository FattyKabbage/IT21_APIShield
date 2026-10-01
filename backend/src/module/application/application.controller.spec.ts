import { ApplicationController } from './application.controller.js';

describe('ApplicationController', () => {
  let controller: ApplicationController;

  beforeEach(() => {
    controller = new ApplicationController({} as never);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});