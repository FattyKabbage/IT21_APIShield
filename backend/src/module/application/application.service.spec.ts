import { ApplicationService } from './application.service.js';

describe('ApplicationService', () => {
  let service: ApplicationService;

  beforeEach(() => {
    service = new ApplicationService({} as never, {} as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});