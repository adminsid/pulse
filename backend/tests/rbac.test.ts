import { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../src/auth/middleware';
import * as jwtModule from '../src/auth/jwt';

// Mock the jwt module
jest.mock('../src/auth/jwt');
const mockVerifyToken = jwtModule.verifyToken as jest.MockedFunction<typeof jwtModule.verifyToken>;

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

function makeNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

describe('requireAuth', () => {
  it('rejects request with no Authorization header', () => {
    const req = makeReq({ headers: {} });
    const { res, status } = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with malformed Authorization header', () => {
    const req = makeReq({ headers: { authorization: 'NotBearer token123' } });
    const { res, status } = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with invalid token', () => {
    mockVerifyToken.mockImplementationOnce(() => {
      throw new Error('invalid token');
    });

    const req = makeReq({ headers: { authorization: 'Bearer badtoken' } });
    const { res, status } = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches user for valid token', () => {
    const payload = { id: 'u1', email: 'a@b.com', role: 'admin', workspace_id: 'w1' };
    mockVerifyToken.mockReturnValueOnce(payload);

    const req = makeReq({ headers: { authorization: 'Bearer validtoken' } });
    const { res } = makeRes();
    const next = makeNext();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(payload);
  });
});

describe('requireRole', () => {
  it('rejects when req.user is not set (unauthenticated)', () => {
    const req = makeReq({ user: undefined });
    const { res, status } = makeRes();
    const next = makeNext();

    requireRole('admin')(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when user has wrong role', () => {
    const req = makeReq({
      user: { id: 'u1', email: 'a@b.com', role: 'va', workspace_id: 'w1' },
    });
    const { res, status } = makeRes();
    const next = makeNext();

    requireRole('admin', 'manager')(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user has an allowed role', () => {
    const req = makeReq({
      user: { id: 'u1', email: 'a@b.com', role: 'manager', workspace_id: 'w1' },
    });
    const { res } = makeRes();
    const next = makeNext();

    requireRole('admin', 'manager')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows exact role match', () => {
    const req = makeReq({
      user: { id: 'u1', email: 'a@b.com', role: 'client', workspace_id: 'w1' },
    });
    const { res } = makeRes();
    const next = makeNext();

    requireRole('client')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
