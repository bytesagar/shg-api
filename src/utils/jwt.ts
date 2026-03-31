import * as jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export type JwtPayload = jwt.JwtPayload | string;

export function signJwt(
  payload: string | object | Buffer,
  options?: jwt.SignOptions,
  secret: jwt.Secret = JWT_SECRET,
) {
  return jwt.sign(payload, secret, options);
}

export function verifyJwt<T = JwtPayload>(
  token: string,
  secret: jwt.Secret = JWT_SECRET,
): T {
  return jwt.verify(token, secret) as T;
}
