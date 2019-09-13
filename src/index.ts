//import, setup and init firebase
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp()
const db = admin.firestore()

//import and setup sendgrid
import * as sgMail from '@sendgrid/mail';
const API_KEY = functions.config().sendgrid.key;
const TEMPLATE_ID = functions.config().sendgrid.template;
sgMail.setApiKey(API_KEY);

//send email to user after signup
export const welcomeEmail = functions.auth.user().onCreate(
    user => {
        const msg = {
            to: user.email, //format as array to send multi emails
            from: 'amdeagencia@gmail.com',
            templateId: TEMPLATE_ID,
            dyamic_template_data: {
                subject: 'Bem vindo!',
                name: user.displayName,
            },
        };

        return sgMail.send(msg);
    })

//send email via web for front
export const broadcastEmail = functions.https.onCall(
    async (data, context) => {
        if (!context.auth && !context.auth.token.email) {
            throw new functions.https.HttpsError('failed-precondition', 'Por favor, realize o login!')
        };

        const msg = {
            to: context.auth.token.email,
            from: 'amdeagencia@gmail.com',
            templateId: TEMPLATE_ID,
            dyamic_template_data: {
                subject: data.subject,
                name: data.text,
            },

        };
        await sgMail.send(msg);

        return { success: true };
    }
);

//send email when something has a new content
export const newOne = functions.firestore.document('posts/{postId}/comments/{comment}').onCreate(
    async (change, context) => {
        //read conent
        const postSnap = await db.collection('posts').doc(context.params.postId).get();

        const post = postSnap.data() || {};
        const comment = change.data() || {};

        const msg = {
            to: post.authorEmail,
            from: 'amdeagencia@gmail.com',
            templateId: TEMPLATE_ID,
            dyamic_template_data: {
                subject: `Novo conteúdo em ${post.title}`,
                name: post.displayName,
                text: `${comment.user} disse ${comment.text}`
            },
        };
        //send
        return sgMail.send(msg);
    }
)

//send a summary email for all users
export const summary = functions.pubsub.schedule('every monday 4:00').onRun(async context => {
    const userSnapshots = await admin.firestore().collection('users').get();

    const emails = userSnapshots.docs.map(snap => snap.data().email);

    const msg = {
        to: emails,
        from: 'amdeagencia@gmail.com',
        templateId: TEMPLATE_ID,
        dyamic_template_data: {
            subject: `Resumo Semanal`,
            text: `Não temos novos emails, mas você pode conferir esse link no celular.`
        },
    };

    return sgMail.send(msg);
})