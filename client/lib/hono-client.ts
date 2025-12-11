import { hc } from 'hono/client';
import type { ApiType } from '../../server/routes.js';

// 型安全なHono RPCクライアント
// APIルートは /api にマウントされているが、routes.tsは /api なしで定義されているため
// クライアント側では /api プレフィックスを含めてアクセスする
export const client = hc<ApiType>('/api');
