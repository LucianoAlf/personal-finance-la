import { describe, expect, it } from 'vitest';

import {
  getPayableBillTagIds,
  normalizePayableBillTags,
} from '@/utils/payableBillTags';

describe('payable bill tag helpers', () => {
  it('hydrates canonical bill_tags rows into tag objects', () => {
    expect(
      normalizePayableBillTags({
        bill_tags: [
          {
            tags: {
              id: 'tag-1',
              user_id: 'user-1',
              name: 'Essencial',
              color: '#111111',
              created_at: '2026-04-08T00:00:00.000Z',
              updated_at: '2026-04-08T00:00:00.000Z',
            },
          },
          { tags: null },
        ],
      }),
    ).toEqual([
      {
        id: 'tag-1',
        user_id: 'user-1',
        name: 'Essencial',
        color: '#111111',
        created_at: '2026-04-08T00:00:00.000Z',
        updated_at: '2026-04-08T00:00:00.000Z',
      },
    ]);
  });

  it('normalizes fetched bill tag objects into form-ready ids', () => {
    expect(
      getPayableBillTagIds([
        {
          id: 'tag-1',
          user_id: 'user-1',
          name: 'Essencial',
          color: '#111111',
          created_at: '2026-04-08T00:00:00.000Z',
          updated_at: '2026-04-08T00:00:00.000Z',
        },
        {
          id: 'tag-2',
          user_id: 'user-1',
          name: 'Fixa',
          color: '#222222',
          created_at: '2026-04-08T00:00:00.000Z',
          updated_at: '2026-04-08T00:00:00.000Z',
        },
      ]),
    ).toEqual(['tag-1', 'tag-2']);
  });
});
