/**
 * Cloud Function TapRise: Payout 5% referral commission on first balance credit
 * 
 * Regra: Quando o administrador creditar saldo pela primeira vez para um usuário
 * que possui `invitedBy` e `commissionPaid === false`, transfere 5% desse valor
 * creditado para o saldo do indicador (referrer), regista na coleção `commissions`,
 * no histórico de transações (`transactions`) do indicador como "Bônus de convite",
 * e marca `commissionPaid = true` no usuário indicado para nunca mais pagar repetido.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.onUserCreditPayoutCommission = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data() || {};
    const afterData = change.after.data() || {};
    const userId = context.params.userId;

    // Verificar se o usuário foi indicado e ainda não teve comissão paga
    const invitedBy = afterData.invitedBy;
    const commissionPaid = afterData.commissionPaid === true;

    if (!invitedBy || commissionPaid) {
      return null;
    }

    // Não permitir auto-indicação
    if (invitedBy === userId) {
      return null;
    }

    // Calcular diferença de saldo creditada (pelo admin)
    const beforeBalance = Number(beforeData.balance || beforeData.saldoVirtual || 0);
    const afterBalance = Number(afterData.balance || afterData.saldoVirtual || 0);
    const balanceDiff = afterBalance - beforeBalance;

    // Apenas agir se houve acréscimo positivo de saldo
    if (balanceDiff <= 0) {
      return null;
    }

    const commissionRate = 0.05; // 5%
    const commissionAmount = Number((balanceDiff * commissionRate).toFixed(2));

    if (commissionAmount <= 0) {
      return null;
    }

    const batch = db.batch();

    // 1. Atualizar saldo do indicador (users/{invitedBy})
    const referrerRef = db.collection('users').doc(invitedBy);
    batch.update(referrerRef, {
      balance: admin.firestore.FieldValue.increment(commissionAmount),
      saldoVirtual: admin.firestore.FieldValue.increment(commissionAmount),
      patrimonioTotal: admin.firestore.FieldValue.increment(commissionAmount),
      totalComissoes: admin.firestore.FieldValue.increment(commissionAmount),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Marcar commissionPaid = true no usuário indicado
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      commissionPaid: true,
      commissionPaidAt: admin.firestore.FieldValue.serverTimestamp(),
      commissionAmount: commissionAmount
    });

    // 3. Registar na coleção `commissions`
    const commissionDocRef = db.collection('commissions').doc();
    batch.set(commissionDocRef, {
      id: commissionDocRef.id,
      referrerUid: invitedBy,
      referredUid: userId,
      referredName: afterData.nome || 'Investidor Convidado',
      referredEmail: afterData.email || '',
      creditAmount: balanceDiff,
      rate: commissionRate,
      commissionAmount: commissionAmount,
      status: 'paid',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      description: `Bônus de convite de 5% sobre 1º crédito de ${balanceDiff.toFixed(2)} MT`
    });

    // 4. Registar no histórico do indicador como "Bônus de convite"
    const transactionDocRef = db.collection('transactions').doc();
    batch.set(transactionDocRef, {
      id: transactionDocRef.id,
      userId: invitedBy,
      uid: invitedBy,
      userName: 'Indicador TapRise',
      userEmail: '',
      type: 'bonus_convite',
      amount: commissionAmount,
      referredUserId: userId,
      referredUserName: afterData.nome || 'Investidor Convidado',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      description: `Bônus de convite (+5%): +${commissionAmount.toFixed(2)} MT pelo 1º crédito de ${afterData.nome || 'convidado'}`
    });

    console.log(`[TapRise] Comissão de convite de 5% (${commissionAmount} MT) paga a ${invitedBy} pelo 1º crédito de ${userId}.`);

    return batch.commit();
  });
