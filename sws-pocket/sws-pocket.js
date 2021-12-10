//app dependencies

const fetch = require('node-fetch');
require('../firebase-config'); //load firebase admin
const Cryptr = require('cryptr');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

const express = require('express');
const router = express.Router();

// Login route
router.get('/login', async (req, res)  => {
    const congID = req.headers.cong_id;
    const congPIN = req.headers.cong_pin;
    const studentPIN = req.headers.user_pin;

    let statusCode;
    let statusMsg;

    if (congID && congPIN & studentPIN) {
        try {
            const congRef = db.collection('congregation_public_data').doc(congID);
            const docSnap = await congRef.get();

            if (docSnap.exists && docSnap.data().congPIN && docSnap.data().usersList) {
                const myKey = congID + "&lmm-oa_" + congPIN;
                const cryptr = new Cryptr(myKey);

                try {
                    const decryptedPIN = cryptr.decrypt(docSnap.data().congPIN);
                    if (congPIN === decryptedPIN) {
                        const decryptedList = cryptr.decrypt(docSnap.data().usersList);
                        let usersList = JSON.parse(decryptedList);
    
                        const userIndex = usersList.findIndex(user => user.PIN === parseInt(studentPIN, 10));
                        if (userIndex >= 0 ) {
                            statusCode = 200;
                            var obj = {};
                            let userInfo = usersList[userIndex];
                            obj.lmmoaID = userInfo.id_lmm_oa || '';
                            obj.studentName = userInfo.name || '';
                            obj.viewList = userInfo.viewStudentPart || [];
                            obj.classCount = docSnap.data().classCount || 1;
                            statusMsg = obj;
                        } else {
                            statusCode = 401;
                            statusMsg = "Misy diso ny fanazavana nampidirinao";
                        }                  
                    } else {
                        statusCode = 401;
                        statusMsg = "Misy diso ny fanazavana nampidirinao";
                    }
                } catch {
                    statusCode = 401;
                    statusMsg = "Misy diso ny fanazavana nampidirinao";
                }
            } else {
                statusCode = 404;
                statusMsg = "Tsy mbola misy ny fanazavana nampidirinao";
            }
        } catch {
            statusCode = 500;
            statusMsg = "Misy olana aty amin’ny programa ampiasainay ka tsy mbola afaka miditra ianao izao";
        }
    } else {
        statusCode = 400;
        statusMsg = "Tsy feno ny fanazavana nomenao";
    }

    res.status(statusCode).send(JSON.stringify({message: statusMsg}))
})

// Get schedules
router.get('/schedules', async (req, res)  => {
    const congID = req.headers.cong_id;
    const congPIN = req.headers.cong_pin;
    const studentPIN = req.headers.user_pin;

    let uri = process.env.NODE_ENV === 'development' ? 'http://localhost:8000/' : 'https://sws2apps.herokuapp.com/';
    uri += "api/sws-pocket/login";

    fetch(uri, {
        method: 'GET',
        headers: {
            'cong_id': congID,
            'cong_pin': congPIN,
            'user_pin': studentPIN, 
        }
    })
    .then(async (response) => {
        const data = await response.json();
        if (response.status === 200) {
            try {
                let finalData = [];
                const congRef = db.collection('congregation_public_data').doc(congID);
                const docSnap = await congRef.get();

                if (docSnap.exists && docSnap.data().schedLMMOA) {
                    const data = docSnap.data().schedLMMOA;
                    for(let i=0; i < data.length; i++) {
                        let obj = {};
            
                        obj.id = data[i].id;
                        obj.title = data[i].title;
                        obj.date_received = data[i].dateSent;
            
                        const myKey = congID + "&lmm-oa_" + congPIN;
                        const cryptr = new Cryptr(myKey);
            
                        try {
                            const decryptedData = cryptr.decrypt(data[i].data);
                            obj.schedule_data = JSON.parse(decryptedData);
                        } catch {}
                        
                        finalData.push(obj);
                    }
                }

                res.status(200).send(JSON.stringify({message: finalData}));
            } catch {
                res.status(500).send(JSON.stringify({message: 'Tsy mbola afaka maka fandaharana avy any amin’ny internet ianao izao.'}))
            }
        } else {
            res.status(response.status).send(JSON.stringify({message: 'Tsy mbola afaka maka fandaharana avy any amin’ny internet ianao izao.'}))
        }
    })
    .catch((error) => {
        res.status(500).send(JSON.stringify({message: error.message}))
    })    
})
  
module.exports = router;