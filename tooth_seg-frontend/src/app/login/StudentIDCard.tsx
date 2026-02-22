"use client";

import styles from "./login.module.css";

type Props = {
  email: string;
  password: string;
  loading: boolean;
  err: string | null;
  apiBase?: string;

  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;

  onForgot: () => void;
  onRegister: () => void;
};

export default function StudentIDCard(props: Props) {
  const {
    email,
    password,
    loading,
    err,
    apiBase,
    onEmailChange,
    onPasswordChange,
    onSubmit,
    onForgot,
    onRegister,
  } = props;

  return (
    <div className={styles.idCard}>
      {/* Right strips */}
      <div className={styles.idTeal} />
      <div className={styles.idBarcodeStrip}>
        <div className={styles.idBarcode} />
      </div>

      {/* Red body */}
      <div className={styles.idBody}>
        {/* Header: use logo image */}
        <div className={styles.idHeader}>
          <img
            src="/assets/white-logo.png"
            className={styles.idUniLogo}
          />
        </div>

        {/* Photo */}
        <div className={styles.idPhotoBlock}>
          <div className={styles.idPhotoInner}>
            <img
              src="/assets/avatar.png"
              alt="User"
              className={styles.idAvatarImg}
            />
          </div>
        </div>

        {/* Form */}
        <form className={styles.idForm} onSubmit={onSubmit}>
          <input
            className={styles.idInput}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            autoComplete="email"
            placeholder="User name or Email"
            required
          />

          <input
            className={styles.idInput}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            autoComplete="current-password"
            placeholder="Password"
            type="password"
            required
          />

          <button className={styles.idLoginBtn} type="submit" disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>

          <button className={styles.idForgot} type="button" onClick={onForgot}>
            Forgot Password?
          </button>

          <div className={styles.idDivider} />

          <div className={styles.idRow}>
            <button className={styles.idSocial} type="button" aria-label="Google login">
              <span className={styles.idG}>G</span>
            </button>
            <button className={styles.idSocial} type="button" aria-label="Social login 2" />
            <button className={styles.idSocial} type="button" aria-label="Social login 3" />

            <button className={styles.idRegister} type="button" onClick={onRegister}>
              Register
            </button>
          </div>

          {err && <div className={styles.idErr}>Error: {err}</div>}

          {apiBase ? (
            <div className={styles.idHint}>
              Backend API: <code>{apiBase}</code>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}