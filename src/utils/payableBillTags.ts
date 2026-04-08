import type { Tag } from '@/types/tags';

type BillTagJoinRow = {
  tags?: Tag | null;
} | null;

export function normalizePayableBillTags(input: {
  bill_tags?: BillTagJoinRow[] | null;
}): Tag[] {
  return (input.bill_tags ?? [])
    .map((row) => row?.tags)
    .filter((tag): tag is Tag => Boolean(tag));
}

export function getPayableBillTagIds(tags?: Tag[] | null): string[] {
  return (tags ?? []).map((tag) => tag.id);
}
