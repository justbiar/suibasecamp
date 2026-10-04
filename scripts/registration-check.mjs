export function existingProfiles(response, payload) {
  if (
    !response.ok ||
    payload?.errors?.length ||
    !Array.isArray(payload?.data?.address?.objects?.nodes)
  ) {
    throw new Error(
      'Could not verify existing profiles on Testnet. No transaction was sent. Try again later.',
    );
  }
  return payload.data.address.objects.nodes;
}

export function successfulDigest(result) {
  if (result?.$kind === 'FailedTransaction' || result?.FailedTransaction) {
    throw new Error(
      result.FailedTransaction?.status?.error?.message ||
        'The registration transaction failed.',
    );
  }
  const transaction = result?.Transaction;
  if (!transaction?.digest || transaction.status?.success !== true) {
    throw new Error(
      'The registration result could not be confirmed. Check the directory before retrying.',
    );
  }
  return transaction.digest;
}
