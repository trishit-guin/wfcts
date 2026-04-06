function buildTeacherNetBalances(entries) {
  const balances = new Map()

  for (const entry of entries) {
    const fromId = String(entry.teacherId)
    const toId = entry.counterpartTeacherId ? String(entry.counterpartTeacherId) : ''

    if (!toId) {
      continue
    }

    balances.set(fromId, (balances.get(fromId) || 0) + 1)
    balances.set(toId, (balances.get(toId) || 0) - 1)
  }

  return balances
}

function computeChainSettlements(entries) {
  const balances = buildTeacherNetBalances(entries)
  const debtors = []
  const creditors = []

  for (const [teacherId, balance] of balances.entries()) {
    if (balance < 0) {
      debtors.push({ teacherId, amount: Math.abs(balance) })
    } else if (balance > 0) {
      creditors.push({ teacherId, amount: balance })
    }
  }

  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const settlements = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(debtor.amount, creditor.amount)

    settlements.push({
      fromTeacherId: debtor.teacherId,
      toTeacherId: creditor.teacherId,
      amount,
    })

    debtor.amount -= amount
    creditor.amount -= amount

    if (debtor.amount === 0) {
      i += 1
    }

    if (creditor.amount === 0) {
      j += 1
    }
  }

  return {
    settlements,
    balances: Array.from(balances.entries()).map(([teacherId, balance]) => ({
      teacherId,
      balance,
    })),
  }
}

module.exports = {
  computeChainSettlements,
}
