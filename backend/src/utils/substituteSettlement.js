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

function rankSubstituteCandidates(availableTeachers, allEntries, timetableCountMap, sameClassSet = new Set()) {
  const balances = buildTeacherNetBalances(allEntries)

  return availableTeachers
    .map((teacher) => {
      const id = String(teacher._id)
      const balance = balances.get(id) || 0
      const workloadSlots = timetableCountMap.get(id) || 0
      const classMatch = sameClassSet.has(id)
      // 0 = owes a sub, 1 = neutral, 2 = already has credits (ask last)
      const tier = balance < 0 ? 0 : balance === 0 ? 1 : 2
      return { teacher, balance, workloadSlots, tier, classMatch }
    })
    .sort((a, b) => {
      // 1st: same-class teachers first
      if (a.classMatch !== b.classMatch) return a.classMatch ? -1 : 1
      // 2nd: debtor → neutral → creditor
      if (a.tier !== b.tier) return a.tier - b.tier
      // 3rd: lighter workload first
      return a.workloadSlots - b.workloadSlots
    })
}

module.exports = {
  computeChainSettlements,
  rankSubstituteCandidates,
}
