import { Component, type ReactNode } from 'react';

/** An optional demo must never take the portfolio down if its lazy chunk fails. */
export class FeatureBoundary extends Component<{
  children: ReactNode;
  label: string;
  active?: boolean;
  floating?: boolean;
  onClose?: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.active === false) return null;
    return (
      <div role="status" className={`${this.props.floating ? 'fixed bottom-20 right-5 z-50 max-w-sm' : 'min-h-40'} rounded-xl border border-outline-variant bg-surface p-5 text-sm text-on-surface`}>
        <p className="font-semibold">{this.props.label} couldn’t load.</p>
        <p className="mt-2 text-on-surface-variant">You can keep exploring the portfolio, or reload the page to try again.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg border border-outline-variant px-4 font-semibold hover:text-primary">Reload page</button>
          {this.props.onClose && <button type="button" onClick={this.props.onClose} className="min-h-11 rounded-lg px-4 hover:text-primary">Dismiss</button>}
        </div>
      </div>
    );
  }
}
