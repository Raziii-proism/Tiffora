                  <p className="text-base font-bold text-slate-900">{formatCurrency(s.amount)}</p>
                  {bill ? (
                    <button
                      onClick={() => toggleBillStatus(bill.id, s.status)}
                      disabled={updatingBillId === bill.id}
                      className={`mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        s.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      {updatingBillId === bill.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : s.status === 'paid' ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {s.status === 'paid' ? 'Paid' : 'Pending'}
                    </button>
                  ) : (
                    <button
                      onClick={() => createAndToggleBill(s.student.id, s.amount, s.presentDays)}
                      disabled={updatingBillId === s.student.id}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {updatingBillId === s.student.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Clock size={12} />
                      )}
                      Pending
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Past months */}
      {Object.keys(billsByMonth)
        .sort()
        .reverse()
        .map((monthKey) => {
          const monthBills = billsByMonth[monthKey];
          const monthCollected = monthBills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
          const monthPending = monthBills.filter((b) => b.status === 'unpaid').reduce((sum, b) => sum + b.amount, 0);
          return (
            <div key={monthKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{formatMonthLabel(monthKey)}</p>
                <button
                  onClick={() => handleDownloadPDFForMonth(monthKey)}
                  disabled={downloading || monthBills.length === 0}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50"
                >
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  PDF
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <p className="text-[11px] text-emerald-600 font-medium">Collected</p>
                  <p className="text-sm font-bold text-emerald-700">{formatCurrency(monthCollected)}</p>
                </div>
                <div className="flex-1 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-[11px] text-amber-600 font-medium">Pending</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(monthPending)}</p>
                </div>
              </div>
              {monthBills.map((bill) => {
                const student = students.find((s) => s.id === bill.student_id);
                if (!student) return null;
                return (
                  <div key={bill.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{student.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{bill.present_days} days present</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-slate-900">{formatCurrency(bill.amount)}</p>
                        <button
                          onClick={() => toggleBillStatus(bill.id, bill.status)}
                          disabled={updatingBillId === bill.id}
                          className={`mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            bill.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          }`}
                        >
                          {updatingBillId === bill.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : bill.status === 'paid' ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {bill.status === 'paid' ? 'Paid' : 'Unpaid'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
    </div>
  );
}
