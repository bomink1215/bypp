import { BadRequestError } from '../params';

/**
 * 참가자 식별 토큰.
 *
 * 로그인이 없으므로 브라우저가 만든 임의 문자열이 곧 신원이다. 방 코드를 아는 사람만
 * 들어올 수 있고, 토큰은 "내가 아까 그 사람"임을 증명하는 용도다. 서버 응답에는
 * 남의 토큰을 절대 포함하지 않는다.
 */
export function requireToken(body: { token?: unknown }): string {
  const t = body.token;
  if (typeof t !== 'string' || t.length < 8 || t.length > 64) {
    throw new BadRequestError('참가자 토큰이 올바르지 않아요.');
  }
  return t;
}

export function requireNickname(body: { nickname?: unknown }): string {
  const raw = body.nickname;
  if (typeof raw !== 'string') throw new BadRequestError('닉네임을 입력해주세요.');

  const name = raw.trim();
  if (name.length === 0) throw new BadRequestError('닉네임을 입력해주세요.');
  if (name.length > 12) throw new BadRequestError('닉네임은 12자까지예요.');
  return name;
}

export function requireCode(raw: string | undefined): string {
  const code = raw?.toUpperCase();
  if (!code || !/^[A-Z0-9]{6}$/.test(code)) throw new BadRequestError('방 코드가 올바르지 않아요.');
  return code;
}
