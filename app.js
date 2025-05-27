//Sin Arbol de Decision : 
require('dotenv').config()
const { createProvider } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const APIChatGPTClass = require('./apigpt.class');

const createBotGPT = async ({ provider, database }) => {
    const botInstance = new APIChatGPTClass(database, provider);
    return botInstance;
}; 

const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterProvider = createProvider(BaileysProvider);

    await createBotGPT({
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();

//Con Arbol de Decision :
// require('dotenv').config();
// const { createProvider, addKeyword, EVENTS, createFlow , createBot} = require('@bot-whatsapp/bot');
// const QRPortalWeb = require('@bot-whatsapp/portal');
// const BaileysProvider = require('@bot-whatsapp/provider/baileys');
// const MockAdapter = require('@bot-whatsapp/database/mock');
// const APIChatGPTClass = require('./apigpt.class');

// const adapterDB = new MockAdapter();
// const adapterProvider = createProvider(BaileysProvider);

// let cuit;

// function validarCuit(cuit) {
//     if (cuit.length != 11) {
//         return false;
//     }
//     var acumulado = 0;
//     var digitos = cuit.split("");
//     var digito = digitos.pop();

//     for (var i = 0; i < digitos.length; i++) {
//         acumulado += digitos[9 - i] * (2 + (i % 6));
//     }

//     var verif = 11 - (acumulado % 11);
//     if (verif == 11) {
//         verif = 0;
//     } else if (verif == 10) {
//         verif = 9;
//     }
//     return digito == verif;
// }

// const createBotGPT = async ({ provider, database }) => {
//     const botInstance = new APIChatGPTClass(database, provider);
//     return botInstance;
// };



// const flowGPT = addKeyword('GPTFLOW')
    
//     .addAnswer('Gracias por proporcionarnos tu CUIT, si deseas continuar con la conversacion solo saluda...:', null, async (ctx, {flowDynamic}) => {
//     console.log("Estoy en el Flow GPT")
//     await flowDynamic(createBotGPT({
//         provider: adapterProvider,
//         database: adapterDB,
//     }))
//     }
//     )



// const flowCapturaCUIT = addKeyword('CUITFLOW')
// .addAnswer(
//     ["📌 ¡Bienvenido al Chatbot de Rentas Córdoba! 🌄", 
//     "Aquí puedes resolver tus consultas y realizar gestiones relacionadas con tus contribuciones.",
//     " Para poder asistirte mejor, necesitamos que nos proporciones tu *CUIT*:"], { capture: true},

//     async (ctx, {gotoFlow, fallBack}) => {
//         // Suponiendo que el CUIT está en ctx.message.text (esto podría variar según la estructura de tu bot)
//         cuit = ctx.body;
//         console.log(cuit)
//         if (validarCuit(cuit)) {
//             // Lógica si el CUIT es válido
//             return gotoFlow(flowGPT);
//         } else {
//             // Lógica si el CUIT no es válido
//             return fallBack("CUIT inválido. Por favor, ingresa un CUIT válido.")
            
//         }
//     }
// )


// const flowInicial = addKeyword(EVENTS.WELCOME)
//     .addAction(async (ctx, {flowDynamic, state, gotoFlow}) =>{
//         console.log({state})
//         const myState = state.getMyState()
//         if (!myState) {
    
//             state.update({ welcome: "enviado" })
//             console.log("atroden")
//            return gotoFlow(flowCapturaCUIT);
    
//           }
//     })
    
    

//     const main = async () => {
//         const adapterFlow = createFlow([flowInicial, flowCapturaCUIT, flowGPT]);
//         createBot({
//             flow: adapterFlow,
//             provider: adapterProvider,
//             database: adapterDB
//         });
    
//         QRPortalWeb();
//     };

// main();


