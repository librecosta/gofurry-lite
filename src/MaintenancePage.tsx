export function MaintenancePage() {
  return (
    <main className="card">
      <img className="logo" src="/logo.svg" alt="" />
      <div className="divider" />
      <h1>GoFurry 正在停机维护</h1>
      <div className="desc">网站正在进行更新升级，请稍后再来。</div>
      <div className="en" lang="en">We'll be back soon.</div>
      <div className="heart" aria-hidden="true">· · · ♥ · · ·</div>
      <div className="footer" lang="en">Maintenance in progress · Thanks for your patience</div>
    </main>
  );
}
