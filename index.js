const express = require("express");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteerExtra.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000; // Corrigido "" no PORT

app.get("/api/login", async (req, res) => {
  try {
    const { lista } = req.query;
    // Corrigido operador para validação
    if (!lista || !lista.includes("|")) {
      return res
        .status(400)
        .json({ error: "Formato inválido! Use /api/login?lista=email|senha" });
    }

    const [email, senha] = lista.split("|");

    const browser = await puppeteerExtra.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true, // Recomendo headless true em ambientes de hosting!
    });

    const page = await browser.newPage();

    await page.goto("https://br.shein.com/user/auth/login", {
      waitUntil: "networkidle2",
    });

    // Email
    const emailSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div.page__login-newUI-continue > div.page__login_input-filed.page__login-newUI-input > div > div.input_filed-wrapper > div > div > input";
    await page.waitForSelector(emailSelector, { visible: true });
    await page.type(emailSelector, email, { delay: 100 });

    const continueSelector =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div.page__login-newUI-continue > div.actions > div > div > button";
    await page.click(continueSelector);

    // Verifica se pediu criar conta
    const seletor =
      "body > div.c-outermost-ctn.j-outermost-ctn > div.container-fluid-1200.j-login-container.she-v-cloak-none > div > div > div > div.page__login-top-style > div:nth-child(2) > div > div.sui-dialog__ctn.sui-animation__dialog_W480 > div > div.sui-dialog__body > div.page__login-newUI-emailPannel > h2 > p";

    const elemento = await page.$(seletor);
    if (elemento) {
      const texto = await page.evaluate((el) => el.textContent, elemento);
      if (texto.trim() === "Crie sua SHEIN conta.") {
        await browser.close();
        return res.send("Conta não existe");
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

    if (elementoErro) {
      await browser.close();
      return res.send("Login inválido");
    } else {
      await browser.close();
      return res.send("Login efetuado");
    }
  } catch (error) {
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
