import Logo from "./assets/logo.svg";
import LogoFooter from "./assets/logo-footer.svg";
import IconGoalPool from "./assets/icon-goal-pool.svg";
import IconImpactPool from "./assets/icon-impact-pool.svg";
import IconCooperative from "./assets/icon-cooperative.svg";
import IconAngry from "./assets/icon-angry.svg";
import IconSuspicious from "./assets/icon-suspicious.svg";
import IconMoneyBag from "./assets/icon-money-bag.svg";
import IconHandClick from "./assets/icon-hand-click.svg";
import IconProgress from "./assets/icon-progress.svg";
import IconNotification from "./assets/icon-notification.svg";
import IconLightning from "./assets/icon-lightning.svg";

export default function Home() {
  const tickerItems = [
    { icon: "🎓", label: "300L Class Dues", amount: "₦312,000 raised" },
    { icon: "🌊", label: "Benue Flood Relief", amount: "₦1.4M raised" },
    { icon: "💒", label: "Kemi's Wedding Gift", amount: "₦680,000 raised" },
    { icon: "🏗️", label: "Community Borehole", amount: "₦2.1M raised" },
    { icon: "✈️", label: "NYSC CDS Trip", amount: "₦540,000 raised" },
    { icon: "⛪", label: "Church Building Fund", amount: "₦890,000 raised" },
  ];

  return (
    <main>
      {/* ═══ HEADER ═══ */}
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#">
            <Logo />
          </a>
          <nav className="site-nav">
            <a href="#problem">The Problem</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#blogs">Blogs</a>
          </nav>
          <a className="btn-cta" href="#cta">
            Get Started →
          </a>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-pill">
            <span className="hero-dot" />
            Built on Stellar · Now in Beta
          </div>

          <h1 className="hero-h1">
            <span className="line">Group money.</span>
            <span className="line">
              <span className="accent">Finally </span>not
            </span>
            <span className="line">
              a <span className="struck">headache.</span>
            </span>
          </h1>

          <p className="hero-subtitle">
            Collecting money in a group is unnecessarily hard,
            embarrassing, and risky. PoolFi fixes that. Share a link,
            everyone pays, the money stays safe until it&apos;s time.
          </p>

          <div className="hero-actions">
            <a className="btn-primary" href="#cta">
              Create Your First Pool →
            </a>
            <a className="btn-secondary" href="#how-it-works">
              See how it works ↓
            </a>
          </div>

          <div className="hero-proof">
            <div className="proof-avatars" aria-hidden="true">
              <span style={{ backgroundColor: "#1b4fd8" }}>AE</span>
              <span style={{ backgroundColor: "#12b76a" }}>CN</span>
              <span style={{ backgroundColor: "#7c3aed" }}>TA</span>
              <span style={{ backgroundColor: "#f79009" }}>NG</span>
              <span style={{ backgroundColor: "#db2777" }}>HS</span>
            </div>
            <p className="proof-text">
              <strong>2,400+ pools</strong> created in beta
              <br />
              across universities, churches &amp; cooperatives
            </p>
          </div>
        </div>
      </section>

      {/* ═══ TICKER ═══ */}
      <section className="ticker-section" aria-label="Live pool highlights">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map(
            (item, i) => (
              <div className="ticker-item" key={i}>
                <span className="ticker-emoji">{item.icon}</span>
                <span className="ticker-label">{item.label} ·</span>
                <span className="ticker-amount">{item.amount}</span>
              </div>
            )
          )}
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section className="problem-section" id="problem">
        <div className="container">
          <p className="section-eyebrow">The problem</p>
          <h2 className="section-title">
            Right now, one person
            <span className="italic-line">suffers for everyone.</span>
          </h2>

          <div style={{ marginTop: 19 }}>
            <article className="scenario-card">
              <p className="scenario-eyebrow">Every week in Nigeria</p>
              <p className="scenario-text">
                The class rep sends a WhatsApp broadcast:{" "}
                <span className="highlight">
                  &quot;Please pay ₦2,000 to Chidi — 0123456789 GTBank.&quot;
                </span>{" "}
                Chidi spends the next two weeks manually checking his bank
                alerts, cross-referencing names, chasing people with DMs,
                fronting money himself when the deadline passes, and watching
                three people in the group privately suspect he kept some of it.
                Nobody wins. This happens every single day across millions of
                Nigerian groups.
              </p>
            </article>
          </div>

          <div className="problem-cards-wrap">
            <article className="problem-card">
              <p className="problem-number">01</p>
              <div className="problem-icon-wrap">
                <IconAngry />
              </div>
              <h3>
                The collector carries all the
                <br />
                burden
              </h3>
              <p>
                One person — the class rep, the church treasurer, the group
                admin — spends days chasing people individually, holding funds
                in their personal account, and fronting money when contributions
                fall short.{" "}
                <strong>
                  It&apos;s a personal favour nobody signed up for.
                </strong>
              </p>
            </article>

            <article className="problem-card">
              <p className="problem-number">02</p>
              <div className="problem-icon-wrap">
                <IconSuspicious />
              </div>
              <h3>Contributors have zero visibility</h3>
              <p>
                How much has been collected? Did my payment reach? Who else
                paid? Nobody knows — everyone just{" "}
                <strong>has to trust one person completely</strong> with no
                verification, no transparency, and no recourse when things go
                wrong.
              </p>
            </article>

            <article className="problem-card">
              <p className="problem-number">03</p>
              <div className="problem-icon-wrap">
                <IconMoneyBag />
              </div>
              <h3>The money has no safe home</h3>
              <p>
                It sits in someone&apos;s personal GTBank account.{" "}
                <strong>
                  There is no structural separation
                </strong>{" "}
                between their money and the group&apos;s money. They can spend
                it, lose it, or simply not return it — and nothing in the system
                prevents this.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="how-section" id="how-it-works">
        <div className="container">
          <p className="section-eyebrow">How PoolFi works</p>
          <h2 className="section-title section-title-light">
            Three steps.
            <span className="italic-line">Zero chasing.</span>
          </h2>
          <p className="how-subtitle">
            Create a pool, share one link, and let the system do the work. No
            manual tracking. No awkward DMs. No more being Chidi.
          </p>

          <div className="steps-row">
            <div className="step-item">
              <div className="step-number-wrap">
                <div className="step-ring-outer" />
                <div className="step-ring-inner" />
                <div className="step-number-circle">1</div>
              </div>
              <div className="step-dashed-line" />
              <h3>Create your pool</h3>
              <p>
                Describe what you&apos;re collecting for. Fill in the pool name,
                amount, deadline, and fields that you wish to be filled. Takes
                under 30 seconds.
              </p>
            </div>

            <div className="step-item">
              <div className="step-number-wrap">
                <div className="step-ring-outer" />
                <div className="step-ring-inner" />
                <div className="step-number-circle">2</div>
              </div>
              <div className="step-dashed-line" />
              <h3>Share the link</h3>
              <p>
                One link. Recipients click it, <strong>join the pool</strong>,
                and pay at their own pace before the deadline. No bank account
                numbers flying around WhatsApp.
              </p>
            </div>

            <div className="step-item">
              <div className="step-number-wrap">
                <div className="step-ring-outer" />
                <div className="step-ring-inner" />
                <div className="step-number-circle">3</div>
              </div>
              <div className="step-dashed-line" />
              <h3>Money releases safely</h3>
              <p>
                Funds are held in a{" "}
                <strong>smart contract vault</strong> — not anyone&apos;s
                personal account. They release automatically when conditions are
                met. Everyone can verify the balance at any time.
              </p>
            </div>
          </div>

          <div className="pool-types">
            <article className="type-card">
              <div className="type-head">
                <span className="type-tag blue">
                  <IconGoalPool />
                  Goal Pool
                </span>
                <h3>
                  Fixed amount.
                  <br />
                  Known group.
                </h3>
                <p className="type-desc">
                  For when you know exactly who needs to pay and how much.
                  Private, invite-based, and simple. The social trust already
                  exists — PoolFi just makes it friction-free and accountable.
                </p>
              </div>
              <div className="type-uses">
                <div className="type-use-item">
                  <span className="type-dot blue" />
                  Class dues and departmental levies
                </div>
                <div className="type-use-item">
                  <span className="type-dot blue" />
                  Wedding, birthday and event collections
                </div>
                <div className="type-use-item">
                  <span className="type-dot blue" />
                  Office and NYSC batch contributions
                </div>
                <div className="type-use-item">
                  <span className="type-dot blue" />
                  Family meeting and association levies
                </div>
              </div>
            </article>

            <article className="type-card">
              <div className="type-head">
                <span className="type-tag green">
                  <IconImpactPool />
                  Impact Pool
                </span>
                <h3>
                  Open cause.
                  <br />
                  Any contributor.
                </h3>
                <p className="type-desc">
                  For community projects and public fundraising where the
                  creator is a stranger to contributors. Multi-signature
                  governance replaces social trust — no single person controls
                  the funds.
                </p>
              </div>
              <div className="type-uses">
                <div className="type-use-item">
                  <span className="type-dot green" />
                  Community borehole and infrastructure
                </div>
                <div className="type-use-item">
                  <span className="type-dot green" />
                  Emergency medical and welfare funds
                </div>
                <div className="type-use-item">
                  <span className="type-dot green" />
                  School building and renovation projects
                </div>
                <div className="type-use-item">
                  <span className="type-dot green" />
                  Cooperative and trade association funds
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES / BENTO ═══ */}
      <section className="features-section">
        <div className="container">
          <p className="section-eyebrow">Built for real groups</p>
          <h2 className="section-title">
            Everything the group
            <span className="italic-line">treasurer actually needs.</span>
          </h2>

          <div className="features-grid">
            {/* Card 1: Join now, pay later */}
            <article className="feat-card">
              <div className="feat-icon-wrap">
                <IconHandClick />
              </div>
              <h3>Join now, pay later</h3>
              <p>
                When someone receives a pool link they can{" "}
                <strong>join without paying immediately</strong>. They&apos;re
                recorded as a member, the pool is saved to their dashboard, and
                the admin sees them as pending. The reminder button finally has
                someone to remind.
              </p>
              <div className="feat-mock">
                <div className="mock-step-row dim">
                  👤&nbsp;&nbsp;Guest arrives via link
                </div>
                <div className="mock-step-label">↓&nbsp;&nbsp;clicks &quot;Join Pool&quot;</div>
                <div className="mock-step-row purple">
                  ✋&nbsp;&nbsp;Joined · Pending payment · Saved to My Pools
                </div>
                <div className="mock-step-label">↓&nbsp;&nbsp;pays before deadline</div>
                <div className="mock-step-row green-row">
                  ✅&nbsp;&nbsp;Paid · Confirmed on-chain · Admin notified
                </div>
              </div>
            </article>

            {/* Card 2: Live progress */}
            <article className="feat-card">
              <div className="feat-icon-wrap">
                <IconProgress />
              </div>
              <h3>Live progress for everyone</h3>
              <p>
                Contributors see exactly how the pool is tracking.{" "}
                <strong>No need to ask the admin for an update</strong> — the
                numbers are always live and verifiable.
              </p>
              <div className="feat-mock">
                <div className="mock-progress-wrap">
                  <div className="mock-progress-header">
                    <span>300L Class Dues · 2025/26</span>
                    <span>78%</span>
                  </div>
                  <div className="mock-progress-bar">
                    <div className="mock-progress-fill" />
                  </div>
                  <div className="mock-chips">
                    <div className="mock-chip">
                      <span className="mock-chip-value green-val">312</span>
                      <span className="mock-chip-label">Paid</span>
                    </div>
                    <div className="mock-chip">
                      <span className="mock-chip-value yellow-val">38</span>
                      <span className="mock-chip-label">Pending</span>
                    </div>
                    <div className="mock-chip">
                      <span className="mock-chip-value blue-val">₦312k</span>
                      <span className="mock-chip-label">Raised</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Card 3: Reminders */}
            <article className="feat-card">
              <div className="feat-icon-wrap">
                <IconNotification />
              </div>
              <h3>Reminders that know who to target</h3>
              <p>
                One button.{" "}
                <strong>Only the people who joined but haven&apos;t paid</strong>{" "}
                get reminded — not the whole group. No more awkward broadcast
                messages to people who already paid.
              </p>
              <div className="feat-mock">
                <div className="mock-member-row">
                  <div
                    className="mock-avatar"
                    style={{ backgroundColor: "#12b76a" }}
                  >
                    FO
                  </div>
                  <span className="mock-member-name">Femi Okonkwo</span>
                  <span className="mock-badge joined">Joined</span>
                </div>
                <div className="mock-member-row">
                  <div
                    className="mock-avatar"
                    style={{ backgroundColor: "#f79009" }}
                  >
                    BA
                  </div>
                  <span className="mock-member-name">Bisi Adeleke</span>
                  <span className="mock-badge pending">Pending</span>
                </div>
                <div className="mock-member-row">
                  <div
                    className="mock-avatar"
                    style={{ backgroundColor: "#7c3aed" }}
                  >
                    UI
                  </div>
                  <span className="mock-member-name">Uche Ibe</span>
                  <span className="mock-badge pending">Pending</span>
                </div>
                <button className="mock-remind-btn">
                  🔔 Remind 38 unpaid members
                </button>
              </div>
            </article>

            {/* Card 4: Instant confirmation */}
            <article className="feat-card">
              <div className="feat-icon-wrap">
                <IconLightning />
              </div>
              <h3>Instant confirmation</h3>
              <p>
                Pay from your PoolFi wallet. Confirmed instantly.{" "}
                <strong>No &quot;I sent it, check again&quot;</strong>{" "}
                conversations ever again.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ═══ STORIES ═══ */}
      <section className="stories-section">
        <div className="container">
          <p className="section-eyebrow">Real stories</p>
          <h2 className="section-title section-title-light">
            From class reps to
            <span className="italic-line">community builders.</span>
          </h2>

          <div className="stories-grid">
            <article className="story-card">
              <span className="story-tag blue">
                <IconGoalPool style={{ width: 18, height: 18 }} />
                Goal Pool
              </span>
              <p className="story-text">
                &quot;I used to spend three weeks chasing 60 classmates for
                dues. Last semester I created a pool, shared the link in our
                WhatsApp group, and had 80% collected in 48 hours.&quot;
              </p>
              <div className="story-author">
                <div
                  className="author-avatar"
                  style={{ backgroundColor: "#1b4fd8" }}
                >
                  AE
                </div>
                <div className="author-info">
                  <h4>Amaka Eze</h4>
                  <p>Class Rep, 300L Engineering, FUTO</p>
                </div>
              </div>
            </article>

            <article className="story-card">
              <span className="story-tag green-tag">
                <IconImpactPool style={{ width: 18, height: 18 }} />
                Impact Pool
              </span>
              <p className="story-text">
                &quot;We raised ₦1.2 million for our village borehole.
                Contributions came from Lagos, Abuja and London. The multi-sig
                meant nobody questioned where the money went — they could verify
                it themselves.&quot;
              </p>
              <div className="story-author">
                <div
                  className="author-avatar"
                  style={{ backgroundColor: "#12b76a" }}
                >
                  CN
                </div>
                <div className="author-info">
                  <h4>Chukwuemeka Nwobi</h4>
                  <p>
                    Community Development Chair,
                    <br />
                    Anambra
                  </p>
                </div>
              </div>
            </article>

            <article className="story-card">
              <span className="story-tag brown">
                <IconCooperative style={{ width: 24, height: 24 }} />
                Cooperative
              </span>
              <p className="story-text">
                &quot;Our cooperative had a treasurer problem every single year —
                money mixed with personal funds, disputes, drama. PoolFi ended
                all of it. The funds are just there. Untouchable until we vote to
                release.&quot;
              </p>
              <div className="story-author">
                <div
                  className="author-avatar"
                  style={{ backgroundColor: "#f79009" }}
                >
                  HA
                </div>
                <div className="author-info">
                  <h4>Hauwa Aliyu</h4>
                  <p>
                    Secretary, Kaduna Market Women
                    <br />
                    Coop
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="cta-section" id="cta">
        <div className="cta-glow" />
        <div className="container cta-inner">
          <h2 className="section-title">
            Stop being
            <span className="italic-line">Chidi.</span>
          </h2>
          <p className="cta-desc">
            Chidi is tired. He&apos;s been chasing 88 classmates for two weeks,
            fronted ₦15,000 of his own money, and three people still think he
            kept some. Create a pool instead.
          </p>
          <div className="cta-actions">
            <a className="btn-primary" href="#">
              Create Your First Pool — Free →
            </a>
            <a className="btn-secondary" href="#">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <LogoFooter />
              <p>
                Collecting money in a group is unnecessarily hard, embarrassing,
                and risky. PoolFi fixes that.
              </p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li>
                  <a href="#">Goal Pools</a>
                </li>
                <li>
                  <a href="#">Impact Pools</a>
                </li>
                <li>
                  <a href="#">My Wallet</a>
                </li>
                <li>
                  <a href="#">Pricing</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li>
                  <a href="#how-it-works">How it works</a>
                </li>
                <li>
                  <a href="#">Security</a>
                </li>
                <li>
                  <a href="#">Documentation</a>
                </li>
                <li>
                  <a href="#">Blog</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li>
                  <a href="#">About</a>
                </li>
                <li>
                  <a href="#">Twitter / X</a>
                </li>
                <li>
                  <a href="#">Privacy Policy</a>
                </li>
                <li>
                  <a href="#">Terms of Service</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 PoolFi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
