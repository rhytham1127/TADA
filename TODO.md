# TODO - Captcha for login/register

- [ ] Add in-memory captcha store + endpoints: GET /api/auth/captcha/refresh and POST /api/auth/captcha/verify
- [x] Add in-memory captcha store + endpoints (work starts)
- [x] Enforce captcha on backend login + register (require captchaId + captchaAnswer)



- [x] Add frontend API helpers for captcha refresh/verify payload submission

- [ ] Update Login.js to display captcha question + send captchaId/answer with login
- [ ] Update Register.js to display captcha question + send captchaId/answer with register

- [ ] Quick manual test: login/register with wrong and correct captcha

