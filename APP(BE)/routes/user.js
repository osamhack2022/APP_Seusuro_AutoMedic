var express = require('express'); 
var bcrypt = require('bcrypt');
var router = express.Router(); 
var con;
var db = require('mysql2/promise');
var mysql = require('../config');
var crypto = require('crypto');
var table = require('../routes/table');
var inform = mysql.inform;
var verify = require('../routes/verify');
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
            cb(null, Date.now()+"-"+file.originalname);
        }
    }),
});


//const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/picture', upload.single('img'), (req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    res.send({status:200, message:"Ok", data:req.file.filename});
});


router.post('/', async function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    console.log("REISTER-PAGE");
	con = await db.createConnection(inform);
	//con.connect(err => {
	 // if (err) throw new Error(err);
	//});
	const name = req.body.name;
	const email = req.body.email;
	const password = req.body.password;
	const phoneNumber = req.body.phoneNumber;
	const serviceNumber = req.body.serviceNumber;
	const mil_rank = req.body.rank;
	const enlistmentDate = req.body.enlistmentDate;
	const dischargeDate = req.body.dischargeDate;
	const militaryUnit = req.body.militaryUnit;
	const pictureName = req.body.pictureName;
	const encoded_pw = bcrypt.hashSync(password, 10);
	var check_militaryUnit_sql = "select * from mil_and_code where militaryUnit = ?;";
	var check_militaryUnit_param = militaryUnit;
	const[check_militaryUnit_result] = await con.query(check_militaryUnit_sql, check_militaryUnit_param);
	if(check_militaryUnit_result.length==0){
		res.send({status:400, message:"없는 부대입니다"});
		return;
	}
//	var encoded_id = crypto.createHash('sha256').update(email).digest('base64');
	var encoded_id = email;	
	var insert_sql = "insert into user values (?,?,?,?,?,?,?,?,?,?,?,now(), now());";
	var insert_param = [encoded_id, name, email, encoded_pw, phoneNumber, serviceNumber, mil_rank, enlistmentDate, dischargeDate, militaryUnit, pictureName];
	var insert_success = await myQuery(insert_sql, insert_param);
	if(insert_success.success){
		var select_sql = "select createdAt, updatedAt from user where id = ?;";
		var select_param = encoded_id;
		const [select_result, select_field] = await con.query(select_sql,select_param);
		if(select_result.length!=0){
			var created_time = select_result[0].createdAt;
			var updated_time = select_result[0].updatedAt;
			var data = {id : encoded_id, name : name, email : email, phoneNumber:phoneNumber, serviceNumber:serviceNumber, rank:mil_rank, enlistmentDate:enlistmentDate, dischargeDate : dischargeDate, militaryUnit : militaryUnit,pictureName:pictureName, createdAt:created_time, updatedAt : updated_time};
			res.send({status:200, message:"Ok", data:data});
		}
		else{
			res.send({status:400, message:"Bad Request"});
		}
	}
	 //res.send("가입 완료");
	else{
		//console.log(insert_success.error);
		if(insert_success.error.code=="ER_DUP_ENTRY"){
			res.send({status:400, message:"이미 있는 id 입니다", data:null});
		}
	} 
});

router.post('/reduplication', async function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    con = await db.createConnection(inform);
    //con.connect(err => {
     // if (err) throw new Error(err);
    //});
    const email = req.body.email;
    var select_sql = "select email from user where email = ?;";
    var select_param = email;
    const [select_result, select_field] = await con.query(select_sql,select_param);
	if(select_result.length==0){
		res.send({status:200, message:"Ok", data:true});
	}
	else{
		res.send({status:200, message:"이미 있는 이메일입니다.", data:false});
	}
});

router.post('/belong', async function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    console.log("check_belong page");

    const militaryUnit = req.body.militaryUnit;
    const accessCode = req.body.accessCode;
    con = await db.createConnection(inform);
    var select_sql = "select * from mil_and_code where militaryUnit = ?;";
    var select_param = militaryUnit;
    //console.log(sql1);
    const [row1, field1] = await con.query(select_sql, select_param);
    if(row1.length==0){
        console.log("없는 부대입니다.");
        res.send({status:400, message:"Bad Request",data:false});
    }
    else{
        if(row1[0].accessCode==accessCode){
            res.send({status:200, message:"Ok", data:true});
        }
        else{
            res.send({status:400, message:"Bad Request", data:false});
        }
    }
});

router.get('/', async function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    const id = req.body.id;
	const userId = req.body.userId;
    const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken,id);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;

    con = await db.createConnection(inform);
    var select_user_inform_sql = "select * from user where id = ?;";
    var select_user_inform_param = userId;
    const [result] = await con.query(select_user_inform_sql ,select_user_inform_param);
    if(result.length==0){
		res.send({status:400, message:"Bad Request", data:null});
    }
    else{

		var data = {id:result[0].id, name:result[0].name, email:result[0].email, phoneNumber:result[0].phoneNumber, serviceNumber:result[0].serviceNumber, rank:result[0].mil_rank, enlistmentDate:result[0].enlistmentDate, dischargeDate:result[0].dischargeDate, militaryUnit:result[0].militaryUnit, pictureName:result[0].pictureName, createdAt:result[0].createdAt, updatedAt:result[0].updatedAt};
		res.header({"accessToken":new_access_token, "refreshToken":new_refresh_token}).send({status:200, message:"Ok", data:data});
	} 
});

router.put('/', async function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    const id = req.body.id;
    const name = req.body.name;
	const email = req.body.email;
	const phoneNumber = req.body.phoneNumber;
	const rank = req.body.rank;
	const enlistmentDate = req.body.enlistmentDate;
	const pictureName = req.body.pictureName;
    const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken,id);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;

    con = await db.createConnection(inform);

    var update_user_inform_sql = "update user set name = ?, email = ?, phoneNumber = ?, mil_rank = ?, enlistmentDate = ?, pictureName = ?, updatedAt = now() where id = ?;";
    var update_user_inform_param = [name, email, phoneNumber, rank, enlistmentDate, pictureName, id];
    const update_success = await myQuery(update_user_inform_sql ,update_user_inform_param);
    if(!update_success){
        res.send({status:400, message:"Bad Request", data:null});
    }
    else{
		var select_user_sql = "select * from user where id = ?;";
		var select_user_param = id;
		const [result] = await con.query(select_user_sql, select_user_param);
        var data = {id:result[0].id, name:result[0].name, email:result[0].email, phoneNumber:result[0].phoneNumber, serviceNumber:result[0].serviceNumber, rank:result[0].mil_rank, enlistmentDate:result[0].enlistmentDate, dischargeDate:result[0].dischargeDate, militaryUnit:result[0].militaryUnit, pictureName:result[0].pictureName, createdAt:result[0].createdAt, updatedAt:result[0].updatedAt};
        res.header({"accessToken":new_access_token, "refreshToken":new_refresh_token}).send({status:200, message:"Ok", data:data});
    }
});

router.delete('/', async function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
	const id = req.body.id;
    const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken,id);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;

    con = await db.createConnection(inform);
    var select_user_inform_sql = "select email, name from user where id = ?;";
    var select_user_inform_param = id;
    var select_token_sql = "select token from refresh_token where id = ?;";
    var select_token_param = id;
    var del_user_sql = "delete from user where id = ?;";
    var del_user_param = id;
    var del_refresh_token_sql = "delete from refresh_token where id = ?";
    var del_refresh_token_param = id;
    await myQuery(del_user_sql, del_user_param);
    await myQuery(del_refresh_token_sql, del_refresh_token_param);
    const [check_token_result] = await con.query(select_token_sql, select_token_param);
    const [check_user_inform_result] = await con.query(select_user_inform_sql ,select_user_inform_param);
    if(check_token_result.length==0&&check_user_inform_result.length==0){
        res.header({"accessToken":new_access_token, "refreshToken":new_refresh_token}).send({status:200, message:"Ok", data:null});
    }
    else res.send({status:400, message:"Bad Request", data:null});
});


module.exports = router;