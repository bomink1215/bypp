import 'server-only';

import { verifyAccessToken } from '../supabase/auth';
import { requireReviewToken, type Author } from './service';

/**
 * 요청 본문에서 작성자를 만든다.
 *
 * 브라우저 토큰은 꼭 있어야 하고, 액세스 토큰은 로그인했을 때만 온다. user id는 클라이언트가
 * 보낸 값을 쓰지 않고 Supabase에 되물어 얻는다 — 남의 계정으로 후기를 쓰거나 지우지 못하게.
 */
export async function authorFrom(body: Record<string, unknown>): Promise<Author> {
  const token = requireReviewToken(body.token);
  const userId = await verifyAccessToken(body.accessToken);
  return { token, userId };
}
