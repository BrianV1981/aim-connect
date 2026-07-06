3G6lVXsU8x6aBG4jN49BgAMC0oh_4QNSHqfREPtW4PPevce1f

ngrok http --url=pox-repulsive-veggie.ngrok-free.dev 80


Setup & Installation
Your Authtoken
Authenticate ngrok agents, SDKs, and the Kubernetes Operator for your own projects with this authtoken. Keep it secret, like a password.

Don’t know how to use your authtoken?
•••••••••••••••••••••••••••••••••••••••••••••••••
Turn password visibility on
Copy
How to install and run ngrok:
Windows
Change platform
1
Install the ngrok agent
Microsoft Store
WinGet via Microsoft Store
Scoop
Download
For the most secure experience, use the Microsoft Store to install ngrok. This type of installation is fully supported by Windows, ensuring automatic updates and compatibility with app management tools.

Microsoft Store Installer
2
Add your authtoken
Run the following command to add your authtoken to the default ngrok.yml configuration file.

Copy code
ngrok config add-authtoken $YOUR_AUTHTOKEN
3
Get a public URL for your app
Run the following in the command line:

Copy code
ngrok http --url=pox-repulsive-veggie.ngrok-free.dev 80
4
Open your dev domain in a browser to see your endpoint working!
Your dev domain: https://pox-repulsive-veggie.ngrok-free.dev

To see endpoint details, traffic policy, and settings, view the endpoints page.

You’re all set. What’s next?

Add security to your endpoint


Add OAuth and restrict domains

Verify webhook signatures

Add SSO with OpenID Connect

Add a password with Basic Auth
Create a policy.yaml file and run this command:

Copy code
ngrok http 80 --traffic-policy-file policy.yaml
contents of policy.yaml
Copy code
on_http_request:
  # redirect users to Google to log in
  - actions:
    - type: oauth
      config:
        provider: google
 
  # allow logins *only* from acme.com
  - expressions:
    - "!actions.ngrok.oauth.identity.email.endsWith('@acme.com')"
    actions:
    - type: deny
Inspect every detail of your traffic

Watch the flow in real time, then dig into the headers, body, latency, response, and more for every request.

Configure your agent

Configure settings like multiple endpoints, load balancing, and traffic transformation with Traffic Policy.

Bring your own domain

Paid feature
Create a DNS CNAME record to use your own domain name for your endpoint URL.

Copy code
ngrok http 8080 --url https://app.acme.com
Run as background service

Recover connectivity after unexpected software or hardware failures.

Copy code
ngrok service install --config .\ngrok.yml
ngrok service start