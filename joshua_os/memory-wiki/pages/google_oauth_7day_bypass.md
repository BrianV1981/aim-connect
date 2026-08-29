# How to Bypass the 7-Day Google OAuth Token Expiration (For Personal Apps & Rclone)

When setting up custom Google Cloud credentials for tools like Rclone or personal AI agents, users constantly run into the dreaded "token expires every 7 days" issue. 

This guide documents exactly how to solve it in minutes.

## The Misconception: "I need Google to verify my app!"
By default, your Google Cloud OAuth app is placed in **"Testing"** mode. Google enforces a strict 7-day token expiration for all apps in Testing.

The console displays scary warnings that pushing your app to **"In Production"** requires you to submit the app for formal human verification by Google. **This is false for personal use.** 

If you are the only one using the app, you can push it to Production without ever submitting it for verification. When you authenticate, you will simply get an "Unverified App" warning. You just click **Advanced -> Go to App (unsafe)** and your token will last forever.

---

## Step-by-Step Fix: Pushing to Production Without Verification

To push your app to production, Google's automated system requires your **Branding** page to be "Complete". However, the UI is notoriously buggy and strict. Here is exactly how to satisfy the automated checks.

### 1. Watch out for the "Ghost Text" Bug
Go to **APIs & Services > OAuth consent screen > Branding**. 
You must explicitly type values into the following fields:
*   **App Name**
*   **User Support Email**
*   **Developer Contact Information** (At the very bottom)

> [!WARNING]
> Google puts grey placeholder text in these boxes that looks exactly like real text (e.g., *"The name of the app asking for consent"*). Ensure you actually click the box and type a name, otherwise the form is quietly marked as incomplete.

### 2. The "Dummy" Homepage & Privacy Policy
Google now explicitly requires an **Application home page** and a **Privacy policy URL** to push an app to external production. 

**The Secret:** You do *not* need to build a website, host HTML files, or write a real privacy policy. Google's automated system does not visit the webpage to read your policy; it only validates that the URL syntax is correct and that the domain matches your "Authorized domains" list.

**How to bypass it in 30 seconds:**
1. Pick a subdomain you own (e.g., `aim-google.yourdomain.com`).
2. Use a tool like Cloudflare Tunnels (`cloudflared tunnel route dns <tunnel-id> aim-google.yourdomain.com`) to instantly create the DNS record. *Note: The tunnel doesn't even need to be active. A 1033 Offline Error is perfectly fine!*
3. Paste the URLs into the Google Cloud form:
   *   **Homepage:** `https://aim-google.yourdomain.com`
   *   **Privacy Policy:** `https://aim-google.yourdomain.com/privacy`
4. Add `yourdomain.com` to the **Authorized domains** list at the bottom of the page.

### 3. Click Publish
Leave the logo blank (uploading a logo actually triggers stricter verification checks). Click **Save and Continue** all the way through the wizard. 

You can now click **Publish App**. Ignore the final warning about verification, and your app is officially In Production. Re-authenticate Rclone one last time, and your tokens will never expire again!
