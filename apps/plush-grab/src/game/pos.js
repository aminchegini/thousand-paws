// The card reader's payment flow: tap, read, process, approve. Payment is simulated
// and never touches real card data. Each approved tap adds exactly one credit, and a
// machine already full of credits refuses the tap without charging. No rendering.

export const POS_TIMES = { read: 0.7, process: 1.1, approved: 1.5, full: 1.4 };

export function createPosSim(handlers = {}) {
  const emit = (name, ...args) => { const h = handlers[name]; if (typeof h === 'function') h(...args); };
  const view = { state: 'idle', t: 0 };

  function enter(state) {
    view.state = state; view.t = 0;
    emit('onState', state);
  }
  function tap() {
    if (view.state !== 'idle') return false;
    const canAccept = typeof handlers.canAccept === 'function' ? handlers.canAccept() : true;
    if (!canAccept) { enter('full'); emit('onSfx', 'buzz'); return false; }
    enter('read');
    emit('onSfx', 'posTap');
    return true;
  }
  function update(dt) {
    if (view.state === 'idle') return;
    view.t += dt;
    if (view.state === 'read' && view.t >= POS_TIMES.read) {
      enter('process');
    } else if (view.state === 'process' && view.t >= POS_TIMES.process) {
      enter('approved');
      emit('onSfx', 'posApproved');
      emit('onApproved');
    } else if (view.state === 'approved' && view.t >= POS_TIMES.approved) {
      enter('idle');
    } else if (view.state === 'full' && view.t >= POS_TIMES.full) {
      enter('idle');
    }
  }
  return { view, tap, update };
}
