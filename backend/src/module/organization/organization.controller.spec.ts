import { OrganizationController } from './organization.controller.js';

describe('OrganizationController', () => {
  let controller: OrganizationController;

  beforeEach(() => {
    controller = new OrganizationController({} as never);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});