// const wa = require('../dist/index');
// var create = require("@open-wa/wa-automate").create;
// import { create, Client, decryptMedia, ev } from '../dist/index';
import { create, Client, decryptMedia, ev, smartUserAgent, NotificationLanguage } from '../src/index';
const mime = require('mime-types');
const fs = require('fs');
const uaOverride = 'WhatsApp/2.16.352 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Safari/605.1.15';
const tosBlockGuaranteed = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/79.0.3945.88 Safari/537.36";
const ON_DEATH = require('death');
//const { phoneNumberFormatter } = require('./helpers/formatter');
let globalClient:Client;
const express = require('express')

const app = express()
app.use(express.json({limit: '200mb'})) //add the limit option so we can send base64 data through the api

const PORT = 8082;


ON_DEATH(async function(signal, err) {
  console.log('killing session');
  if(globalClient)await globalClient.kill();
})

/**
 * Detect the qr code
 */
ev.on('qr.**', async (qrcode,sessionId) => {
  //base64 encoded qr code image
  const imageBuffer = Buffer.from(qrcode.replace('data:image/png;base64,',''), 'base64');
  fs.writeFileSync(`qr_code${sessionId?'_'+sessionId:''}.png`, imageBuffer);
});

/**
 * Detect when a session has been started successfully
 */
ev.on('STARTUP.**', async (data,sessionId) => {
  if(data==='SUCCESS') console.log(`${sessionId} started!`)
})

/**
 * Detect all events
 */
ev.on('**', async (data,sessionId,namespace) => {
  console.log("\n----------")
  console.log('EV',data,sessionId,namespace)
  console.log("----------")
})

/**
 * Detect the session data object
 */
ev.on('sessionData.**', async (sessionData, sessionId) =>{
  console.log("\n----------")
  console.log('sessionData',sessionId, sessionData)
  console.log("----------")
})

/**
 * Detect the session data object encoded as a base64string
 */
ev.on('sessionDataBase64.**', async (sessionData, sessionId) =>{
  console.log("\n----------")
  console.log('sessionData',sessionId, sessionData)
  console.log("----------")
})

async function start(client: Client) {
  app.use(client.middleware(true));

app.listen(PORT, function () {
  console.log(`\n• Listening on port ${PORT}!`);
});

  globalClient=client;
  console.log('starting');
  const me = await client.getMe();
  console.log("start -> me", me);
  // const chats = await client.getAllChatsWithMessages(false);
  // console.log("TCL: start -> chats", chats)
  // console.log("TCL: getAllChatsWithMessages ->", chats.length, chats[0]);
  // console.log("TCL: start ->chats", chats[0].msgs);

  // const newMessages = await client.getAllUnreadMessages();
  // console.log("TCL: start -> newMessages", newMessages)
  // console.log("TCL: getAllNewMessages ->", newMessages.length, newMessages[0]);

  client.onAck((c:any) => console.log(c.id,c.body,c.ack));

    client.onAddedToGroup(newGroup => console.log('Added to new Group', newGroup.id));

    client.onIncomingCall(async call=>{
      console.log('newcall',call);

      let formatted = call.peerJid.replace(/\D/g, '');

      if (formatted.startsWith('0')) {
        formatted = '62' + formatted.substr(1);
      }

      const message = 'Ada Panggilan Masuk Dari '+formatted+'';

      const sendText = await client.sendText(call.peerJid,message);
    });


    const prods = await client.getBusinessProfilesProducts(me.wid)
    console.log(prods)

  // client.onParticipantsChanged("XXXXXXXX-YYYYYYYY@g.us", (participantChangedEvent:any) => console.log("participant changed for group", participantChangedEvent));
  
  //Returns 'CONNECTED' or 'TIMEOUT' or 'CONFLICT' (if user opens whatsapp web somewhere else)
  client.onStateChanged(state=>{
    console.log('statechanged', state)
    if(state==="CONFLICT" || state==="UNLAUNCHED") client.forceRefocus();
  });

  // setTimeout(_=> client.kill(), 3000);

  // const allmsgs = await client.loadAndGetAllMessagesInChat('XXXXXXXX-YYYYYYYY@g.us",true,false);
  // console.log("TCL: start -> allMessages", allmsgs.length);

  client.onAnyMessage(message=>{
    console.log(message.type)
    if(message.body==='DELETE') client.deleteMessage(message.from,message.id,false)
  });
  // client.onParticipantsChanged("XXXXXXXXXX-YYYYYYYYY@g.us",x=>console.log(x))
  client.onMessage(async message => {
    try {

      //const mp3_message_id = await client.sendAudio(message.from,'https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3', null)
      //console.log("start -> mp", mp3_message_id)

      const isConnected = await client.isConnected();
      console.log("TCL: start -> isConnected", isConnected)
      console.log(message.body, message.id, message.type, message?.quotedMsgObj?.id);

      if (message.type==='sticker') 
      {
          const sticker_from_url_gif_id = await client.sendStickerfromUrl(message.from, "https://i.giphy.com/media/yJil9u57ybQ9movc6E/source.gif")
          console.log("start -> reply chat type sticker", sticker_from_url_gif_id)
      }
      else if (message.type==='image')
      {
          if (message.mimetype) 
          {
            const filename = `${message.t}.${mime.extension(message.mimetype)}`;
            let mediaData  = await decryptMedia(message, uaOverride);
            const image = await client.sendImage(
                            message.from,
                            `data:${message.mimetype};base64,${mediaData.toString('base64')}`,
                            filename,
                            `You just sent me this ${message.type}`
                          );
            console.log("start -> reply chat type image", image);
          }
      }
      else if (message.type==='video')
      {
          const filename = `${message.t}.${mime.extension(message.mimetype)}`;
          let mediaData  = await decryptMedia(message, uaOverride);
          //const mp4_as_sticker = await client.sendMp4AsSticker(message.from,mediaData);
          const video = await client.sendImage(
                            message.from,
                            `data:${message.mimetype};base64,${mediaData.toString('base64')}`,
                            filename,
                            `You just sent me this ${message.type}`
                          );
          console.log("start -> reply chat type video", video);
      }
      else if (message.type==='document' || message.type==='audio')
      {
          const filename = `${message.t}.${mime.extension(message.mimetype)}`;
          const mediaData = await decryptMedia(message);
          const imageBase64 = `data:${message.mimetype};base64,${mediaData.toString(
            'base64'
          )}`;

          await client.sendFile(
            message.from,
            imageBase64,
            filename,
            `You just sent me this ${message.type}`
          );
      }
      else if (message.type==='ptt')
      {
          const mp3_message_id = await client.sendAudio(message.from,'https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3', null)
          console.log("start -> voice", mp3_message_id);
      }
      else if (message.type==="location") 
      {
        if(message.shareDuration) 
          console.log('This user has started sharing their live location', message.author || message.from)
          console.log("TCL: location -> message", message.lat, message.lng, message.loc)
          await client.sendLocation(message.from, `${message.lat}`, `${message.lng}`, `Youre are at ${message.loc}`)
      }
      else
      {
          if (message.body === 'Hi') 
          {
              const send = await client.sendText(message.from, '👋 Hello!');

              console.log("start -> reply from message Hi", send);
          }
          else if (message.body==='selamat pagi') 
          {
              const sendText = await client.sendText(message.from,'Good Morning');
              console.log("start -> reply from message selamat pagi", sendText);

              console.log("start -> message from", message.from);
          }
          else if (message.body==='selamat sore') 
          {
              const sendText = await client.sendText(message.from,'Good Afternoon');
              console.log("start -> reply from message selamat sore", sendText);

              console.log("start -> message from", message.from);

          }
          else if (message.body==='send contact') 
          {
              let formatted = message.from.replace(/\D/g, '');
              
              const sendContact = await client.sendContact(message.from,"6289660846315@c.us");
              console.log("start -> reply send contact", sendContact);
          }
          else if (message.body==='delete message') 
          {
              //const sendContact = await client.sendContact(message.from,"6289660846315@c.us");
              const deleteMessage = await client.deleteMessage(message.from,message.id,false);
              console.log("start -> delete message", deleteMessage);
              const sendText = await client.sendText(message.from,'Pesan Berhasil dihapus di nomor Bot WA');
              console.log("start -> send message", sendText);
          }
          else if (message.body==='send link youtube')
          {
              const sendlink = await client.sendYoutubeLink(message.from, "https://www.youtube.com/watch?v=VELru-FCWDM&ab_channel=Academind");
              console.log("start -> reply send link youtube", sendlink);
          }
          else if (message.body==='last seen')
          {
              const lastSeen = await client.getLastSeen(message.from);
              console.log("start -> reply get lastSeen", lastSeen);
          }
          else if (message.body==='create group')
          {
              const createGroup = await client.createGroup('New group','6285871176003@c.us');
              console.log("start -> create group",createGroup);

              const getGroupInviteLink = await client.getGroupInviteLink(createGroup.gid._serialized);
              console.log("start -> getGroupInviteLink",getGroupInviteLink);

              const sendText = await client.sendText(message.from,getGroupInviteLink);
              console.log("start -> send message", sendText); 

              //let member = message.chatId.toString;
              //let member = `${message.chatId}`;
              // if(message.chatId)
              //const addmember = await client.addParticipant(createGroup.gid._serialized, `${message.from}`);
              //console.log("start -> add member group",addmember);
          }
          else if (message.body==='get all group') 
          {
              const getallGroup = await client.getAllGroups().then(chats => {
                
                const nameGroup = [];

                for(let i=0; i<chats.length; i++){
                  nameGroup.push(chats[i].name)
                }

                const msg = "List Nama Group Nomor WA: "+nameGroup.join(", ");

                const sendText = client.sendText(message.from,msg);
                console.log("start -> get all group", sendText);

              });
          }
          else if (message.body==='get contact') 
          {
              const getContact = await client.getContact('6289660846315@c.us');

              const msg = "Nama Kontak: "+getContact.name;

              const sendText = client.sendText(message.from,msg);
              console.log("start -> get contact", sendText);
          }
          else if (message.body==='get all chat') 
          {
              const getallChat = await client.getAllChats().then(chat =>{
                  const namaChat = [];

                  for(let i=0; i<chat.length; i++){
                    namaChat.push(chat[i].name)
                  }

                  const msg = "List All Chat Dari: "+namaChat.join(", ");

                  const sendText = client.sendText(message.from,msg);
                  console.log("start -> get all chat", sendText);
              });

              //console.log("start -> get all chat", getallChat);
          }
          else if (message.body==='get baterai level') 
          {
              const bateraiLevel = await client.getBatteryLevel();

              const msg = "Baterai level Nomor Bot WA: "+bateraiLevel+"%";

              const sendText = client.sendText(message.from,msg);

              console.log("start -> get baterai level", sendText);
          }
          else if (message.body==='get member group') 
          {
              const getGroupMembersId = await client.getGroupMembersId('6285871176003-1612765463@g.us');

              const msg = "List Member dari Group (Coba new group) : "+getGroupMembersId.join(", ");

              const sendText = client.sendText(message.from,msg);

              console.log("start -> get member group", sendText);   
          }
          else if (message.body==='forward message') 
          {
              const forward = client.forwardMessages(message.from,message.id,false);
              console.log('forward message',forward);
          }
          // else if (message.body==='send giphy')
          // {
          //     const send_giphy = await client.sendGiphy(message.from,'https://media.giphy.com/media/oYtVHSxngR3lC/giphy.gif','Oh my god it works');
          //     console.log('send giphy',send_giphy);
          // }
          else if (message.body==='add member group')
          {
              const addmember = await client.addParticipant('6285871176003-1612765463@g.us','6289660846315@c.us');
              console.log("start -> add member group",addmember);
          }
          else if (message.body==='remove member group')
          {
              const removemember = await client.removeParticipant('6285871176003-1612765463@g.us','6289660846315@c.us');
              console.log("start -> add remove group",removemember);
          }
          else if (message.body==='promote member group')
          {
              const promotemember = await client.promoteParticipant('6285871176003-1612765463@g.us','6289660846315@c.us');
              console.log("start -> promote Admin group",promotemember);
          }
          else if (message.body==='demote member group')
          {
              const demotemember = await client.demoteParticipant('6285871176003-1612765463@g.us','6289660846315@c.us');
              console.log("start -> demote Admin group",demotemember);
          }
          else if (message.body==='group info') 
          {
              const getGroup = await client.getGroupInfo('6285871176003-1612765463@g.us');
              console.log("start -> get group info",getGroup);
          }
      }

    } catch (error) {
      console.log("TCL: start -> error", error)
    }
  });

    // const groupCreationEvent = await client.createGroup('coolnewgroup','0000000000@c.us');
    // console.log("start -> groupCreationEvent", groupCreationEvent)
  //wait a few seconds and make a group

}

//you can now create two sessions pointing 
//two the same message handler


/**
 * it can be null, which will default to 'session' folder.
 * You can also override some puppeteer configs, set an executable path for your instance of chrome for ffmpeg (video+GIF) support
 * and you can AND SHOULD override the user agent.
 */
create({
  sessionId:'customer-support',
  // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  useChrome: true,
  restartOnCrash: start,
  headless:false,
  throwErrorOnTosBlock:true,
  qrTimeout:0,   //set to 0 to wait forever for a qr scan
  authTimeout:0, //set to 0 to wait forever for connection to phone
  killProcessOnBrowserClose: true,
  killProcessOnTimeout: true,
  autoRefresh:true, //default to true
  safeMode: true,
  disableSpins: true,
  hostNotificationLang: NotificationLanguage.PTBR,
  viewport: {
    // width: 1920,
    height: 1200
  },
  popup: 3012,
  defaultViewport: null,
  cacheEnabled:false,
  // devtools:true,
  //OR
  // devtools:{
  //   user:'admin',
  //   pass:'root'
  // },
  //example chrome args. THIS MAY BREAK YOUR APP !!!ONLY FOR TESTING FOR NOW!!!.
  // chromiumArgs:[
  //   '--aggressive-cache-discard',
  //   '--disable-cache',
  //   '--disable-application-cache',
  //   '--disable-offline-load-stale-cache',
  //   '--disk-cache-size=0'
  // ]
})
// create()
.then(async client => await start(client))
.catch(e=>{
  console.log('Error',e.message);
  // process.exit();
});

//or you can set a 'session id'
// create('newsession').then(client => start(client));

//DO NOT HAVE TO SESSIONS WITH THE SAME ID

//BE WARNED, SETTING THIS UP WITH 2 NUMBERS WILL RESULT IN AN ECHO CHAMBER
//IF YOU SEND AN IMAGE WITH ONE PHONE IT WILL PING PONG THAT IMAGE FOR ETERNITY
