export interface OutboundExistingLinkState {
  external_object_id?: string | null;
  external_list_id?: string | null;
  sync_status?: string | null;
}

export interface OutboundUpsertTaskResult {
  id: string;
  projectId?: string | null;
}

export async function processOutboundUpsertLink(params: {
  existingLink?: OutboundExistingLinkState | null;
  onUpdateExisting: (link: OutboundExistingLinkState) => Promise<{
    taskId: string;
    listId: string;
  }>;
  onCreateNew: () => Promise<{
    taskId: string;
    listId: string;
  }>;
}): Promise<
  | { kind: 'suspended_remote_deleted' }
  | { kind: 'remote_upserted'; taskId: string; listId: string }
> {
  if (params.existingLink?.sync_status === 'remote_deleted') {
    return { kind: 'suspended_remote_deleted' };
  }

  if (params.existingLink?.external_object_id) {
    const result = await params.onUpdateExisting(params.existingLink);
    return {
      kind: 'remote_upserted',
      taskId: result.taskId,
      listId: result.listId,
    };
  }

  const result = await params.onCreateNew();
  return {
    kind: 'remote_upserted',
    taskId: result.taskId,
    listId: result.listId,
  };
}
