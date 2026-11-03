# Deploying AwarenessAlert online (free, InfinityFree)

Result: a **live link** like `https://awarenessalert.infinityfreeapp.com` that works on any phone or
computer, with the same React website, PHP API and MySQL database as on your laptop.

How it is put together online (one website, one address):

```
https://your-site.infinityfreeapp.com/                      -> React website (index.html + assets/)
https://your-site.infinityfreeapp.com/awarenessalert-api/   -> PHP API (same files as XAMPP)
MySQL database                                              -> created in the hosting control panel
```

The website automatically talks to the API on the same address (see `src/api.ts`), so nothing
has to be changed in the code. On your laptop it still uses XAMPP exactly as before.

---

## Step 1 — Build the upload folder (on your laptop, 1 minute)

In VS Code → Terminal, inside the project folder:

```
npm run deploy:package
```

It ends with `Ready: deploy/htdocs`. That folder contains everything to upload:
the website, `.htaccess`, and `awarenessalert-api/` (your local photos and database export are NOT included).

## Step 2 — Create the free hosting account (10 minutes)

1. Go to **infinityfree.com** → **Register** → verify your email.
2. Client area → **Create Account** → choose a free subdomain, e.g. `awarenessalert` +
   `.infinityfreeapp.com` → **Create**. Wait until the account is **Active**.
3. Write down from the account page: **Username** (`if0_…`) and **Password** (click *Show*).

## Step 3 — Create the MySQL database (3 minutes)

1. Account page → **Control Panel** (click *I Approve* if asked) → **MySQL Databases**.
2. Database name: `awareness` → **Create Database**.
3. Write down the **MySQL Host Name** (like `sql123.infinityfree.com`), **Database Name**
   (like `if0_12345678_awareness`), **User Name** (`if0_12345678`) and the password (same as in step 2).

## Step 4 — Fill in config.php (2 minutes)

1. Open `deploy/htdocs/awarenessalert-api/`.
2. Copy `config.sample.php` → rename the copy to **`config.php`**.
3. Open it and fill in the 4 MySQL values from step 3, and choose your own secret for `$setupKey`.
   (config.php is never pushed to GitHub, so the password stays private.)

## Step 5 — Upload (10 minutes)

**Easiest: FileZilla** (free FTP program, filezilla-project.org):
1. Account page → **FTP Details**: host (e.g. `ftpupload.net`), username (`if0_…`), password.
2. FileZilla → enter host, username, password, port 21 → **Quickconnect**.
3. Right side: open **htdocs** and delete the default files (`index2.html` etc.).
4. Left side: open your `deploy\htdocs` folder → select **everything inside it**
   (`.htaccess`, `index.html`, `assets`, `awarenessalert-api`) → drag to the right side into `htdocs`.

(Alternative: Control Panel → **Online File Manager** → `htdocs` → Upload. Make sure the hidden
file `.htaccess` is uploaded too.)

## Step 6 — Create the tables and demo data (1 minute)

Open in your browser (use YOUR address and YOUR setup key):

```
https://your-site.infinityfreeapp.com/awarenessalert-api/setup.php?key=YOUR-SETUP-KEY
```

You should see **"Setup complete ✓"**. Without the key it says "Setup is locked", so strangers cannot
wipe your database. To reset the demo data before the presentation:
`setup.php?key=YOUR-SETUP-KEY&reset=1`.

## Step 7 — Open the live site

```
https://your-site.infinityfreeapp.com
```

Check: the green **"Prototype · live MySQL data"** label at the bottom, 25 vendors on the map, and
log in with the demo accounts from the README.

> A new free subdomain can take **up to a few hours** before it opens everywhere. If it says
> "site not found", wait and try again (or try on mobile data).

---

## Updating the live site later

1. Change the code on your laptop and test it with XAMPP.
2. `npm run deploy:package`
3. Upload `deploy/htdocs` again (do **not** overwrite your online `config.php`;
   it is not in the package, so a normal upload keeps it).
4. If the database changed, open `/awarenessalert-api/upgrade.php` once (data is kept).

## Troubleshooting

| Problem | Fix |
|---|---|
| Yellow "Demo mode" bar online | `config.php` values are wrong, or Step 6 was not done. Open `/awarenessalert-api/api.php` to see the error. |
| "Setup is locked" | Add `?key=YOUR-SETUP-KEY` (the value of `$setupKey` in config.php). |
| A page gives 404 after refresh | The `.htaccess` file was not uploaded into `htdocs`. |
| Photos do not upload | Free hosts limit upload size; try a smaller photo (under 2 MB). |
| Site not found | New subdomains need time; wait an hour. |

## Notes for the report

- **Hosting:** InfinityFree (free shared hosting: Apache + PHP 8 + MySQL), HTTPS via the free SSL of the subdomain.
- **Security online:** database password only in `config.php` (not in Git); `setup.php` locked with a secret key;
  uploaded files can never run as code (`uploads/.htaccess`); session cookie is `HttpOnly`, `SameSite=Lax` and
  `Secure` on HTTPS; all role checks stay on the server.
- **Limits of free hosting:** slower than a paid server, daily hit limits, no custom email. Fine for a prototype demo.
