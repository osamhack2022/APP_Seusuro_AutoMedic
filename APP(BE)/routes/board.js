var express = require('express'); 
var bcrypt = require('bcrypt');
var router = express.Router(); 
var con;
var db = require('mysql2/promise');
var mysql = require('../config');
var crypto = require('crypto');
var table = require('../routes/table');
var inform = mysql.inform;
const bodyParser = require('body-parser');
const multer = require('multer');
const form_data = multer();
var app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(form_data.array());

async function myQuery(sql, param){
    try{
        const [row, field] = await con.query(sql,param);
        return {success:true, error:null};
    }catch(error){
        console.log(error);
        return {success:false, error:error};
    }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/');
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  }),
});


//const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', upload.single('img'), (req, res) => {
  console.log(req.file); 
	res.send(req.file);
});

router.get('/:filename', (req, res) => {
	var name = req.param.filename;
  //console.log(req.file);
    res.sendFile("/public/"+filename);
});


module.exports = router;
