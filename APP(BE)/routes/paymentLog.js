var express = require('express'); 
var bcrypt = require('bcrypt');
var router = express.Router(); 
var con;
var db = require('mysql2/promise');
var mysql = require('../config');
var crypto = require('crypto');
var inform = mysql.inform;
var verify = require('../routes/verify');
var table = require('../routes/table');
var deleteLog = require('../routes/deleteLog');
async function myQuery(sql, param){
    try{
        const [row, field] = await con.query(sql,param);
        return true;
    }catch(error){
        console.log(error);
        return false;
    }
}

router.post('/filter', async function(req, res, next) {
/*
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
*/
    res.setHeader("Access-Control-Expose-Headers","*");

    const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
    var user_id = verify_success.id;
	res.setHeader("accessToken", new_access_token);
	res.setHeader("refreshToken", new_refresh_token);
    con = await db.createConnection(inform);
    const check_militaryUnit = "select militaryUnit from user where id = ?;";
    const check_militaryUnit_param = user_id;
    const [check_militaryUnit_result] = await con.query(check_militaryUnit, check_militaryUnit_param);
    if(check_militaryUnit_result.length==0){
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
    var militaryUnit = check_militaryUnit_result[0].militaryUnit;
	var type = req.body.type;
	var date = req.body.date;
	//var select_log_sql = "select * from paymentLog_"+militaryUnit+" where receiptPayment in (?,?,?,?,?) and DATE(createdAt) between ? and ? order by createdAt, log_num;";
	var select_log_sql = "";
	var select_log_param = [];
	var str_type_arr;
	if(type==null){
		select_log_sql = "select * from paymentLog_"+militaryUnit+" where receiptPayment in ('수입', '불출', '폐기', '반납', '이동') and DATE(createdAt) between ? and ? order by createdAt, log_num;";
	}
	else{
		select_log_sql = "select * from paymentLog_"+militaryUnit+" where receiptPayment in ";
		var param = "(";
		for(let i=0; i<type.length; ++i){
			param+="'";
			param+=type[i];
			param+="'";
			if(i!=type.length-1) param+=",";
		}
		select_log_sql+=param;
		select_log_sql+=") and DATE(createdAt) between ? and ? order by createdAt, log_num;";
		//console.log(str_type_arr);
	}
	if(date==null){
		select_log_param.push("1000-01-01");
		select_log_param.push("9999-12-31");
	}
	else{
		select_log_param.push(date);
        select_log_param.push(date);
	}
	console.log(select_log_sql);
	//var select_log_sql = "select * from paymentLog where receiptPayment in ? and DATE(createdAt) between ? and ? order by createdAt;";
	var [select_log_result] = await con.query(select_log_sql, select_log_param);
	if(select_log_result.length==0){
		res.send({status:200, message:"검색결과가 없습니다.", data:null});
		return;
	}
	var data = [];
    for(let i=0; i<select_log_result.length; ++i){
    	var id = select_log_result[i].id;
    	var receiptPayment = select_log_result[i].receiptPayment;
    	var confirmor_id = select_log_result[i].confirmor_id;
    	var target = select_log_result[i].target;
    	var YearMonthDate = select_log_result[i].YearMonthDate;
    	var log_num = select_log_result[i].log_num;
    	var property_id_arr = select_log_result[i].property_id_arr;
    	var storagePlace_arr = select_log_result[i].storagePlace_arr;
    	var amount_arr = select_log_result[i].amount_arr;
    	var unit_arr = select_log_result[i].unit_arr;
    	var createdAt = select_log_result[i].createdAt;
    	var updatedAt = select_log_result[i].updatedAt;
    	var arr_property_id = property_id_arr.split('/');   ////////////////
    	var arr_storagePlace = storagePlace_arr.split('/'); ////////////////
    	var str_arr_amount = amount_arr.split('/');
    	var arr_unit = unit_arr.split('/');//////////////////
    	var arr_amount = [];    ////////////////////
    	var arr_name = [];  ///////////////////
    	var arr_expirationDate = [];    ///////////
    	var len = arr_property_id.length;
    	var getsu;
    	for(let k=0; k<str_arr_amount.length; ++k){
        	getsu = parseInt(str_arr_amount[k]);
        	arr_amount.push(getsu);
    	}
    	var p_id;
    	for(let k=0; k<arr_property_id.length; ++k){
        	p_id = arr_property_id[k];
        	var id_split = p_id.split('-');
        	arr_name.push(id_split[0]);
        	var myexpirationDate = id_split[1]+"-"+id_split[2]+"-"+id_split[3];
        	arr_expirationDate.push(myexpirationDate);
    	}
    	var niin_arr = [];
    	var niin, category;
    	var category_arr = [];
    	var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
    	var select_medicInform_param;
        for(let k=0; k<arr_property_id.length; ++k){
            select_medicInform_param = arr_name[k];
            var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
            if(select_medicInform_result.length==0){
                res.send({status:400, message:"Bad Request", data:null});
                return;
            }
            else{
                niin = select_medicInform_result[0].niin;
                category = select_medicInform_result[0].category;
            }
        	niin_arr.push(niin);
        	category_arr.push(category);
        }
        var items = [];
        var individual_item;
        for(let k=0; k<len; ++k){
            individual_item = {name:arr_name[k], amount:arr_amount[k], unit:arr_unit[k],category:category_arr[k],niin:niin_arr[k], storagePlace:arr_storagePlace[k], expirationDate:arr_expirationDate[k]};
            items.push(individual_item);
        }
        var select_user_sql = "select * from user where id = ?;";
        var select_user_param = confirmor_id;
        const [select_user_result, select_user_field] = await con.query(select_user_sql, select_user_param);
        if(select_user_result.length==0){
           res.send({status:400, message:"Bad Request"});
            return;
        }
        var user_name = select_user_result[0].name;
        var email = select_user_result[0].email;
        var phoneNumber = select_user_result[0].phoneNumber;
        var serviceNumber = select_user_result[0].serviceNumber;
        var rank = select_user_result[0].mil_rank;
        var enlistmentDate = select_user_result[0].enlistmentDate;
        var dischargeDate = select_user_result[0].dischargeDate;
        var militaryUnit = select_user_result[0].militaryUnit;
        var pictureName = select_user_result[0].pictureName;
        var user_createdAt = select_user_result[0].createdAt;
        var user_updatedAt = select_user_result[0].updatedAt;
		var militaryUnit_blank = militaryUnit.replace(/_/g, " ");
        var user_data = {id:confirmor_id, name:user_name, email:email, phoneNumber:phoneNumber, serviceNumber:serviceNumber, rank:rank, enlistmentDate:enlistmentDate, dischargeDate:dischargeDate,militaryUnit:militaryUnit_blank,pictureName:pictureName, createdAt:user_createdAt, updatedAt:user_updatedAt };
        var individual_data = {id:id, receiptPayment:receiptPayment, target:target,items:items, confirmor:user_data, createdAt:createdAt, updatedAt:updatedAt};
            //res.send({status:200, message:"Ok", data:data});
        data.push(individual_data);
    }
    //res.header({"accessToken":new_access_token, "refreshToken":new_refresh_token}).send({status:200, message:"Ok", data:data});
	res.send({status:200, message:"Ok", data:data});
});


router.put('/', async function(req, res, next) {
/*	
res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
*/
	res.setHeader("Access-Control-Expose-Headers","*");

    con = await db.createConnection(inform);

	const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
    var user_id = verify_success.id;
	var confirmor_id = req.body.confirmor;
	res.setHeader("accessToken", new_access_token);
    res.setHeader("refreshToken", new_refresh_token);
	if(user_id!=confirmor_id){
        res.send({status:200, message:'본인 계정의 로그만 변경 가능합니다.', data:null});
        return;
    }
	await con.beginTransaction();
/*
    const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken,confirmor_id);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
*/
/*
    const accessToken = req.header('Authorization');
    if (accessToken == null) {
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
    var verify_success = await verify.verifyFunction(accessToken, confirmor_id);
    if(!verify_success){
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
*/
    const check_militaryUnit = "select militaryUnit from user where id = ?;";
    const check_militaryUnit_param = confirmor_id;
    const [check_militaryUnit_result] = await con.query(check_militaryUnit, check_militaryUnit_param);
    if(check_militaryUnit_result.length==0){
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }

    var militaryUnit = check_militaryUnit_result[0].militaryUnit;
    /*
	const receiptPayment = req.body.receiptPayment;
    const target = req.body.target;
    const items = req.body.items;
*/
	var log_id = req.body.id;
	var select_log_sql =  "select * from paymentLog_"+militaryUnit+" where id = ?;";
	var select_log_param = log_id;
	const [select_log_result] = await con.query(select_log_sql, select_log_param);
	//console.log(select_log_result.length);
	if(select_log_result.length!=1){
		res.send({status:400, message:"해당 로그가 없습니다", data:null});
		await con.rollback();
		return;
	}



/*
	var deleteLog_success = await deleteLog.deleteLog(militaryUnit, confirmor_id, log_id,con);
	if(!deleteLog_success){
		res.send({status:400, message:"Bad Request", data:null});
		await con.rollback();
		//console.log(deleteLog_success.message);
		return;
	}
	console.log("삭제성공");
*/
	//res.send("일단 스탑");
	//return;
/**
	var select_log_sql =  "select * from paymentLog_"+militaryUnit+" where id = ?;";
    var select_log_param = log_id;
    const [select_log_result] = await con.query(select_log_sql, select_log_param);
    //console.log(select_log_result.length);
    if(select_log_result.length!=1){
		res.send({status:400, message:"해당 로그가 없습니다", data:null});
        return;
        //return {success:false, message:"해당 로그가 없습니다"};
    }
*/
    var origin_receiptPayment = select_log_result[0].receiptPayment;
    confirmor_id = select_log_result[0].confirmor_id;
    var target = select_log_result[0].target;
    var YearMonthDate = select_log_result[0].YearMonthDate;
    var log_num = select_log_result[0].log_num;
    var property_id_arr = select_log_result[0].property_id_arr;
    var storagePlace_arr = select_log_result[0].storagePlace_arr;
    var amount_arr = select_log_result[0].amount_arr;
    var unit_arr = select_log_result[0].unit_arr;
    var createdAt = select_log_result[0].createdAt;
    var updatedAt = select_log_result[0].updatedAt;
   /*     console.log(property_id_arr);
        console.log(storagePlace_arr);
        console.log(amount_arr);
        console.log(unit_arr);
*/
    var arr_property_id = property_id_arr.split('/');   ////////////////
    var arr_storagePlace = storagePlace_arr.split('/'); ////////////////
    var str_arr_amount = amount_arr.split('/');
    var arr_unit = unit_arr.split('/');//////////////////
    var arr_amount = [];    ////////////////////
    var arr_name = [];  ///////////////////
    var arr_expirationDate = [];    ///////////
    var len = arr_property_id.length;
    var getsu;
    for(let i=0; i<str_arr_amount.length; ++i){
        getsu = parseInt(str_arr_amount[i]);
        arr_amount.push(getsu);
    }
    var p_id;
	//var category_arr = [];
    for(let i=0; i<arr_property_id.length; ++i){
        p_id = arr_property_id[i];
        var id_split = p_id.split('-');
        arr_name.push(id_split[0]);
        var myexpirationDate = id_split[1]+"-"+id_split[2]+"-"+id_split[3];
        arr_expirationDate.push(myexpirationDate);
    }
	var category_arr = [];
	for(let i=0; i<arr_name.length; ++i){
		var select_category_sql = "select category from medicInform_"+militaryUnit+" where name = ?;";
		var select_category_param = arr_name[i];
		var [select_category_result] = await con.query(select_category_sql, select_category_param);
		if(select_category_result.length==0){
			res.send({status:400, message:"Bad Request", data:null});
            return;
		}
		category_arr.push(select_category_result[i].category);
	}
    var select_property_sql, select_property_param, select_property_result;
    var modify_amount;
    var update_property_sql, update_property_param, update_property_result;
    var insert_property_sql, insert_property_param, insert_property_result;
    var insert_storagePlace_sql, insert_storagePlace_param, insert_storagePlace_result;
    var update_storagePlace_sql, update_storagePlace_param, update_storagePlace_result;
    var select_storagePlace_sql, select_storagePlace_param, select_storagePlace_result;
    var delete_storagePlace_sql, delete_storagePlace_param, delete_storagePlace_result;
    var delete_property_sql, delete_property_param, delete_property_result;
    var storagePlace_id;
    if(origin_receiptPayment=="수입"){  //수입을 했어도 옛날거기 때문에 지금 없을수도 있음
        for(let i=0; i<len; ++i){
            select_property_sql = "select * from property_"+militaryUnit+" where id = ?;";
            select_property_param = arr_property_id[i];
            [select_property_result] = await con.query(select_property_sql, select_property_param);
            if(select_property_result==0){  //없으면
                insert_property_sql = "insert into property_"+militaryUnit+" values (?,?,?,?,?,?,now(), now());";
                insert_property_param = [arr_property_id[i], arr_name[i], (-1)*arr_amount[i], arr_unit[i],category_arr[i] ,arr_expirationDate[i]];
                insert_property_result = await myQuery(insert_property_sql, insert_property_param);
                if(!insert_property_result){
                    await con.rollback();
					res.send({status:400, message:"Bad Request", data:null});
                    return;
                    //return {success:false, message:"Bad Request"};
                }
                storagePlace_id = arr_property_id[i]+"-"+arr_storagePlace[i];
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [arr_property_id[i], arr_storagePlace[i]];
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                if(select_storagePlace_result.length==0){
                    insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                    insert_storagePlace_param = [storagePlace_id, arr_property_id[i], arr_storagePlace[i], (-1)*arr_amount[i], arr_unit[i]];
                    insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                    if(!insert_storagePlace_result){
						await con.rollback();
						res.send({status:400, message:"Bad Request", data:null});
                    	return;
                    }
                }
                else{
                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount-arr_amount[i];
                    if(final_amount==0){
                        delete_storagePlace_sql = "delete from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                        delete_storagePlace_param = [arr_property_id[i], arr_storagePlace[i]];
                        if(!delete_storagePlace_result){
							await con.rollback();
							res.send({status:400, message:"Bad Request", data:null});
                    		return;
                    //      await con.rollback();
                            //return false;
                            //return {success:false, message:"Bad Request"};
                        }
                    }
                    else{
                        update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                        update_storagePlace_param = [final_amount, arr_property_id[i], arr_storagePlace[i]];
                        update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                        if(!update_storagePlace_result){
							await con.rollback();
							res.send({status:400, message:"Bad Request", data:null});
                    		return;
                    //      await con.rollback();
                            //return false;
                            //return {success:false, message:"Bad Request"};
                        }
                    }
                }
/////////////////////////////

            }
            else{   //있으면
                var origin_totalAmount = select_property_result[0].totalAmount;
                modify_amount = arr_amount[i];
                var final_totalAmount = origin_totalAmount-modify_amount;
                console.log(final_totalAmount);
                if(final_totalAmount==0){
                    delete_property_sql = "delete from property_"+militaryUnit+" where id = ?;";
                    delete_property_param = arr_property_id[i];
                    delete_property_result = await myQuery(delete_property_sql, delete_property_param);
                    if(!delete_property_result){
                        console.log("열로옴");
                    //  await con.rollback();
						await con.rollback();
						res.send({status:400, message:"Bad Request", data:null});	
                    	return;
                        //return false;
                        //return {success:false, message:"Bad Request"};
                    }
                }
                else{
                    update_property_sql = "update property_"+militaryUnit+" set totalAmount = ? where id = ?;";
                    console.log(final_totalAmount+"  "+arr_property_id[i]);
                    update_property_param = [final_totalAmount, arr_property_id[i]];
                    update_property_result = await myQuery(update_property_sql, update_property_param);
                    if(!update_property_result){
                        console.log("열로옴");
                    //  await con.rollback();
                        //return false;
						await con.rollback();
						res.send({status:400, message:"Bad Request", data:null});
                    	return;
                        //return {success:false, message:"Bad Request"};
                    }
                }
                storagePlace_id = arr_property_id[i]+"-"+arr_storagePlace[i];
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [arr_property_id[i], arr_storagePlace[i]];
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                if(select_storagePlace_result.length==0){
                    insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                    insert_storagePlace_param = [storagePlace_id, arr_property_id[i], arr_storagePlace[i], (-1)*arr_amount[i], arr_unit[i]];
                    insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                    if(!insert_storagePlace_result){
                    //  await con.rollback();
						await con.rollback();
						res.send({status:400, message:"Bad Request", data:null});
                    	return;
                        //return false;
                        //return {success:false, message:"Bad Request"};
                    }
                }
                else{
                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount-arr_amount[i];
                    if(final_amount==0){
                        delete_storagePlace_sql = "delete from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                        delete_storagePlace_param = [arr_property_id[i], arr_storagePlace[i]];
                        delete_storagePlace_result = await myQuery(delete_storagePlace_sql, delete_storagePlace_param);
                        if(!delete_storagePlace_result){
                    //      await con.rollback();
                            //return false;
							await con.rollback();
							res.send({status:400, message:"Bad Request", data:null});
                    		return;
                            //return {success:false, message:"Bad Request"};
                        }
                    }
                    else{
                        update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                        update_storagePlace_param = [final_amount, arr_property_id[i], arr_storagePlace[i]];
                        update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                        if(!update_storagePlace_result){
                    //      await con.rollback();
                            //return false;
							await con.rollback();
							res.send({status:400, message:"Bad Request", data:null});
                    		return;
                            //return {success:false, message:"Bad Request"};
                        }
                    }
                }
//////////////////////////////////
            }
        }
    }
    else if(origin_receiptPayment=="이동"){ ////타겟은 빼주고, storagePlace는 더해주고

        for(let i=0; i<len; ++i){   //타겟은 빼주고, storagePlace는 더해주고

            select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
            select_storagePlace_param = [arr_property_id[i], target];
            [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);

            if(select_storagePlace_result.length==0){ //일단 마이너스로 넣자
                storagePlace_id = arr_property_id[i]+"-"+target;
                insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                insert_storagePlace_param = [storagePlace_id, arr_property_id[i], target, (-1)*arr_amount[i], arr_unit[i]];
                insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                if(!insert_storagePlace_result){
        //          await con.rollback();
                    //return false;
					await con.rollback();
					res.send({status:400, message:"Bad Request", data:null});
                    return;
                    //return {success:false, message:"Bad Request"};
                }
            }
            else{
                var origin_amount = select_storagePlace_result[0].amount;
                var final_amount = origin_amount-arr_amount[i];
                if(final_amount==0){
                    delete_storagePlace_sql = "delete from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                    delete_storagePlace_param = [arr_property_id[i], target];
                    delete_storagePlace_result = await myQuery(delete_storagePlace_sql, delete_storagePlace_param);
                    if(!delete_storagePlace_result){
                        //res.send(arr_property_id[i]+" "+target);
        //              await con.rollback();
                        //return false;
						await con.rollback();
						res.send({status:400, message:"Bad Request", data:null});
                    	return;
                        //return {success:false, message:"Bad Request"};
                    }
                }
                else{
                    update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                    update_storagePlace_param = [final_amount, arr_property_id[i], target];
                    update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                    if(!update_storagePlace_result){
        //              await con.rollback();
                        //return false;
						await con.rollback();
						res.send({status:400, message:"Bad Request", data:null});
                    	return;
                        //return {success:false, message:"Bad Request"};
                    }
                }
            }
            select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
            select_storagePlace_param = [arr_property_id[i], arr_storagePlace[i]];
            [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
            if(select_storagePlace_result.length==0){
                storagePlace_id = arr_property_id[i]+"-"+arr_storagePlace[i];
                insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                insert_storagePlace_param = [storagePlace_id, arr_property_id[i], arr_storagePlace[i], arr_amount[i], arr_unit[i]];
                insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                if(!insert_storagePlace_result){
        //          await con.rollback();
                    //return false;
					await con.rollback();
					res.send({status:400, message:"Bad Request", data:null});
                    return;
                    //return {success:false, message:"Bad Request"};
                }
            }
            else{
                var origin_amount = select_storagePlace_result[0].amount;
                var final_amount = origin_amount+arr_amount[i];
                console.log(final_amount);
                update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                update_storagePlace_param = [final_amount, arr_property_id[i], arr_storagePlace[i]];
                update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                if(!update_storagePlace_result){
        //          await con.rollback();
                    //return false;
					await con.rollback();
					res.send({status:400, message:"Bad Request", data:null});
                    return;
                    //return {success:false, message:"Bad Request"};
                }
            }
        }
    }
    else{   //폐기 반납 불출일때는 단순 빼기였으니까 그냥 그대로 더해준다\
    //  var insert_storagePlace_sql, insert_storagePlace_param, insert_storagePlace_result;
        for(let i=0; i<len; ++i){
            select_property_sql = "select * from property_"+militaryUnit+" where id = ?;";
            select_property_param = arr_property_id[i];
            [select_property_result] = await con.query(select_property_sql, select_property_param);
/*
            var property_name = select_property_result[0].name;
            var property_totalAmount = select_property_result[0].totalAmount;
            var property_unit = select_property_result[0].unit;
            var property_expirationDate = select_property_result[0].expirationDate;
            var property_createdAt = select_property_result[0].createdAt;
            var property_updatedAt = select_property_result[0].updatedAt;
*/
            if(select_property_result==0){  //오류가 아니라 그 빼기함으로써 다 써서 없는거임
                insert_property_sql = "insert into property_"+militaryUnit+" values (?,?,?,?,?,?, now(), now());";
                insert_property_param = [arr_property_id[i], arr_name[i], arr_amount[i], arr_unit[i],category_arr[i], arr_expirationDate[i]];
                insert_property_result = await myQuery(insert_property_sql, insert_property_param);
                if(!insert_property_result){
        //          await con.rollback();
                    //return false;
					await con.rollback();
					res.send({status:400, message:"Bad Request", data:null});
                    return;
                }
            //약장함에도 약 없음
                console.log(arr_property_id[i]+" 를 "+arr_amount[i]+" 개 insert 성공");
                storagePlace_id = arr_property_id[i]+"-"+arr_storagePlace[i];
                insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                insert_storagePlace_param = [storagePlace_id, arr_property_id[i], arr_storagePlace[i], arr_amount[i], arr_unit[i]];
                insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                //storagePlace_id = arr_property_id[i]+"-"+arr_storagePlace[i];
                if(!insert_storagePlace_result){
        //          await con.rollback();
                    //return false;
					await con.rollback();
					res.send({status:400, message:"Bad Request", data:null});
                    return;
                    //return {success:false, message:"Bad Request"};
                }
                console.log(arr_property_id[i]+" 를 "+arr_storagePlace[i]+" 에 "+arr_amount[i]+" 개 insert 성공");
            }
            else{
                var origin_totalAmount = select_property_result[0].totalAmount;
                modify_amount = arr_amount[i];
                var final_totalAmount = origin_totalAmount+modify_amount;
                update_property_sql = "update property_"+militaryUnit+" set totalAmount = ? where id = ?;";
                update_property_param = [final_totalAmount, arr_property_id[i]];
                update_property_result = await myQuery(update_property_sql, update_property_param);
                if(!update_property_result){
        //          await con.rollback();
                    //return false;
					await con.rollback();
					res.send({status:400, message:"Bad Request", data:null});
                    return;
                    //return {success:false, message:"Bad Request"};
                }
                storagePlace_id = arr_property_id[i]+"-"+arr_storagePlace[i];
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where id = ?;";
                select_storagePlace_param = storagePlace_id;
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                if(select_storagePlace_result.length==0){
                    insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                    insert_storagePlace_param = [storagePlace_id, arr_property_id[i], arr_storagePlace[i], arr_amount[i], arr_unit[i]];
                    insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                    if(!insert_storagePlace_result){
        //              await con.rollback();
                        //return false;
						await con.rollback();
						res.send({status:400, message:"Bad Request", data:null});
                    	return;
                        //return {success:false, message:"Bad Request"};
                    }
                }
                else{
                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount+arr_amount[i];
                    update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where id = ?;";
                    update_storagePlace_param = [final_amount, storagePlace_id];
                    update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                    if(!update_storagePlace_result){
        //              await con.rollback();
                        //return false;
						await con.rollback();
						res.send({status:400, message:"Bad Request", data:null});
                    	return;
                        //return {success:false, message:"Bad Request"};
                    }
                }
///////////////////////////////////////약장함도 고치기
            }
            //console.log(select_property_result[0]);

        }
    }
	var origin_receiptPayment = select_log_result[0].receiptPayment;
    confirmor_id = select_log_result[0].confirmor_id;
    var target = select_log_result[0].target;
    var YearMonthDate = select_log_result[0].YearMonthDate;
    var log_num = select_log_result[0].log_num;
    var property_id_arr = select_log_result[0].property_id_arr;
    var storagePlace_arr = select_log_result[0].storagePlace_arr;
    var amount_arr = select_log_result[0].amount_arr;
    var unit_arr = select_log_result[0].unit_arr;
    var createdAt = select_log_result[0].createdAt;
    var updatedAt = select_log_result[0].updatedAt;
   /*     console.log(property_id_arr);
        console.log(storagePlace_arr);
        console.log(amount_arr);
        console.log(unit_arr);
*/     
    var arr_property_id = property_id_arr.split('/');   ////////////////
    var arr_storagePlace = storagePlace_arr.split('/'); ////////////////
    var str_arr_amount = amount_arr.split('/');
    var arr_unit = unit_arr.split('/');//////////////////
    var arr_amount = [];    ////////////////////
    var arr_name = [];  ///////////////////
    var arr_expirationDate = [];    ///////////
    var len = arr_property_id.length;
    var getsu;
    for(let i=0; i<str_arr_amount.length; ++i){
        getsu = parseInt(str_arr_amount[i]);
        arr_amount.push(getsu);
    }
    var p_id;
    for(let i=0; i<arr_property_id.length; ++i){
        p_id = arr_property_id[i];
        var id_split = p_id.split('-');
        arr_name.push(id_split[0]);
        var myexpirationDate = id_split[1]+"-"+id_split[2]+"-"+id_split[3];
        arr_expirationDate.push(myexpirationDate);
    }	
	var select_property_sql, select_property_param, select_property_result;
	var modify_amount;
    var update_property_sql, update_property_param, update_property_result;
    var insert_property_sql, insert_property_param, insert_property_result;
    var insert_storagePlace_sql, insert_storagePlace_param, insert_storagePlace_result;
    var update_storagePlace_sql, update_storagePlace_param, update_storagePlace_result;
    var select_storagePlace_sql, select_storagePlace_param, select_storagePlace_result;
	var delete_storagePlace_sql, delete_storagePlace_param, delete_storagePlace_result;
	var delete_property_sql, delete_property_param, delete_property_result;
	var storagePlace_id;
	const receiptPayment = req.body.receiptPayment;
    target = req.body.target;
    const items = req.body.items;
	confirmor_id = req.body.confirmor;
	var str_property_id_arr = "";
    var str_storagePlace_arr = "";
    var str_amount_arr = "";
    var str_unit_arr = "";
	var name, amount, unit, storagePlace, expirationDate, property_id
	property_id_arr = [];
	storagePlace_arr = [];
	amount_arr = [];
	unit_arr = [];
	var name_arr = [];
	var expirationDate_arr = [];
    len = items.length;
	var property_id,niin;
	var niin_arr = [];
	var category;
    if(receiptPayment=="수입"){
        for(let i=0; i<items.length; ++i){
            console.log("--------------------------");
            name = items[i].name;
            amount = items[i].amount;
            unit = items[i].unit;
            storagePlace = items[i].storagePlace;
            expirationDate = items[i].expirationDate;
			expirationDate = expirationDate.substr(0,10);
			category = items[i].category;
            property_id = name+"-"+expirationDate;
            property_id_arr.push(property_id);
            unit_arr.push(unit);
            storagePlace_arr.push(storagePlace);
            amount_arr.push(amount);
            console.log(property_id);
            select_property_sql = "select * from property_"+militaryUnit+" where id = ?;";
            select_property_param = property_id;
            [select_property_result] = await con.query(select_property_sql, select_property_param);
            if(select_property_result.length==0){   //새로 재산에 넣고 storagePlace에도 넣기
                insert_property_sql = "insert into property_"+militaryUnit+" values (?,?,?,?,?,?,now(), now());";
                insert_property_param = [property_id,name,amount,unit,category,expirationDate];
                insert_property_result = await myQuery(insert_property_sql, insert_property_param);
                if(insert_property_result){
                    console.log(property_id+" property 테이블 insert 성공");
                }
                else{
					console.log(property_id+" property 테이블 insert 실패");
					res.send({status:400, message:"Bad Request", data:null});
					await con.rollback();
					return;
                }
                storagePlace_id = property_id+"-"+storagePlace;
                insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                insert_storagePlace_param = [storagePlace_id,property_id,storagePlace,amount,unit];
                insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                if(insert_storagePlace_result){
                    console.log(storagePlace_id+" storagePlace 테이블 insert 성공");
                }
                else{
                    console.log(storagePlace_id+" storagePlace 테이블 insert 실패");
					res.send({status:400, message:"Bad Request", data:null});
                    await con.rollback();
                    return;
                }
            }
            else{   ////재산 테이블 수정 storagePlace도 수정
                var origin_total_amount = select_property_result[0].totalAmount;
                var finalAmount = origin_total_amount+amount;
                //console.log(finalAmount+" 씨발");
                update_property_sql = "update property_"+militaryUnit+" set totalAmount = ?, updatedAt = now() where id = ?;";
                update_property_param = [finalAmount, property_id];
                update_property_result = await myQuery(update_property_sql, update_property_param);
                if(update_property_result){
                    console.log(property_id+" property 테이블 update 성공");
                }
                else{
                    console.log(property_id+" property 테이블 update 실패");
					res.send({status:400, message:"Bad Request", data:null});
                    await con.rollback();
                    return;
                }
                storagePlace_id = property_id+"-"+storagePlace;
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [property_id, storagePlace];
                console.log("스토리즈 플레이스 아이디 : "+select_storagePlace_param);
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                console.log("길이 : "+select_storagePlace_result.length);
                if(select_storagePlace_result.length==0){    //원래 그 약장함에 약이 없었음 => insert
                    console.log(storagePlace+" 에 "+property_id+" 약이 없었으니까 insert 함");
                    insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                    insert_storagePlace_param = [storagePlace_id,property_id,storagePlace,amount,unit];
                    insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                    if(insert_storagePlace_result){
                        console.log(storagePlace_id+" storagePlace 테이블 insert 성공");
                    }
                    else{
                        console.log(storagePlace_id+" storagePlace 테이블 insert 실패");
						res.send({status:400, message:"Bad Request", data:null});
                    	await con.rollback();
                    	return;
                    }
                }
                else{   //원래 그 약장함에 약이 있었음 => update

                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount+amount;
                    console.log(origin_amount+" "+final_amount);
                    update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                    update_storagePlace_param = [final_amount, property_id, storagePlace];
                    update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                    if(update_storagePlace_result){
                        console.log(storagePlace_id+" storagePlace 테이블 update 성공");
                    }
                    else{
                        console.log(storagePlace_id+" storagePlace 테이블 update 실패");
						res.send({status:400, message:"Bad Request", data:null});
                    	await con.rollback();
                    	return;
                    }
                }
            }
        }
		var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
        var select_medicInform_param;
        for(let i=0; i<items.length; ++i){
            select_medicInform_param = items[i].name;
            var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
            if(select_medicInform_result.length==0){
                var new_niin = Math.random().toString(36).substring(2, 12);
                niin = new_niin;
                var insert_medicInform_sql = "insert into medicInform_"+militaryUnit+" values (?,?,?);"
                var insert_medicInform_param = [items[i].name, items[i].category, new_niin];
                var insert_medicInform_success = await myQuery(insert_medicInform_sql, insert_medicInform_param);
                if(!insert_medicInform_success){
                    res.send({status:400, message:"Bad Request", data:null});
                    await con.rollback();
                    return;
                }
            }
            else{
                niin = select_medicInform_result[0].niin;
            }
            niin_arr.push(niin);
        }
    }
    else if(receiptPayment=="이동"){
        for(let i=0; i<items.length; ++i){
            console.log("--------------------------");
            name = items[i].name;
            amount = items[i].amount;
            unit = items[i].unit;
            storagePlace = items[i].storagePlace;
            expirationDate = items[i].expirationDate;
			expirationDate = expirationDate.substr(0,10);
            property_id = name+"-"+expirationDate;
            property_id_arr.push(property_id);
            storagePlace_arr.push(storagePlace);
            unit_arr.push(unit);
            amount_arr.push(amount);
            console.log(property_id);
            select_property_sql = "select * from property_"+militaryUnit+" where id = ?;";
            select_property_param = property_id;
            [select_property_result] = await con.query(select_property_sql, select_property_param);
            if(select_property_result.length==0){
			//	console.log("씨발 "+deleteLog_success);
				res.send({status:400, message:property_id+" 가 없습니다", data:null});
				//console.log("여기임 ㅋㅋ");
                await con.rollback();
				//await con.commit();
                return;
            }
            else{   ////재산 테이블 수정할필요가 없음 바로 storagePlace 수정
                storagePlace_id = property_id+"-"+storagePlace;
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [property_id, storagePlace];
                console.log("스토리즈 플레이스 아이디 : "+select_storagePlace_param);
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                console.log("길이 : "+select_storagePlace_result.length);
                if(select_storagePlace_result.length==0){    //원래 그 약장함에 약이 없었음 => 에러
					res.send({status:400, message:storagePlace+" 엔 "+ property_id+" 가 없습니다", data:null});
                    await con.rollback();
                    return;
                }
                else{
                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount-amount;
					if(final_amount<0){
						res.send({status:400, message:storagePlace+" 에 "+property_id+" 가 "+origin_amount+" 개 있는데 "+amount+" 개 빼려고 합니다", data:null});
                    	await con.rollback();
                    	return;
					}
                    //console.log(origin_amount+" "+final_amount);
                    if(final_amount==0){
                        delete_storagePlace_sql = "delete from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                        delete_storagePlace_param = [property_id, storagePlace];
                        delete_storagePlace_result = await myQuery(delete_storagePlace_sql, delete_storagePlace_param);
                        if(delete_storagePlace_result){
                            console.log(property_id+" storagePlace 테이블 삭제  성공");
                        }
                        else{
                            console.log(property_id+" storagePlace 테이블 삭제 실패");
							res.send({status:400, message:"Bad Request", data:null});
                    		await con.rollback();
                    		return;
                        }
                    }
                    else{
                        update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                        update_storagePlace_param = [final_amount, property_id, storagePlace];
                        update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                        console.log(update_storagePlace_result);
                        if(update_storagePlace_result){
                            console.log(storagePlace_id+" storagePlace 테이블 update 성공");
                        }
                        else{
                            console.log(storagePlace_id+" storagePlace 테이블 update 실패");
							res.send({status:400, message:"Bad Request", data:null});
                    		await con.rollback();
                    		return;
                        }
                    }
                }
                storagePlace_id = property_id+"-"+target;
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [property_id, target];
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                console.log(select_storagePlace_result[0]);
                if(select_storagePlace_result.length==0){    //원래 그 약장함에 약이 없었음 => insert
                    console.log(storagePlace+" 에 "+property_id+" 약이 없었으니까 insert 함");
                    insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                    insert_storagePlace_param = [storagePlace_id,property_id,target,amount,unit];
                    insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                    if(insert_storagePlace_result){
                        console.log(storagePlace_id+" storagePlace 테이블 insert 성공");
                    }
                    else{
                        console.log(storagePlace_id+" storagePlace 테이블 insert 실패");
						res.send({status:400, message:"Bad Request", data:null});
                    	await con.rollback();
                    	return;
                    }
                }
                else{   //원래 그 약장함에 약이 있었음 => update

                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount+amount;
                    console.log(origin_amount+" "+final_amount);
                    update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                    update_storagePlace_param = [final_amount, property_id, target];
                    update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                    if(update_storagePlace_result){
                        console.log(storagePlace_id+" storagePlace 테이블 update 성공");
                    }
                    else{
                        console.log(storagePlace_id+" storagePlace 테이블 update 실패");
						res.send({status:400, message:"Bad Request", data:null});
                    	await con.rollback();
                    	return;
                    }
                }
            }
        }
		var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
        var select_medicInform_param;
        for(let i=0; i<items.length; ++i){
            select_medicInform_param = items[i].name;
            var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
            if(select_medicInform_result.length==0){
                res.send({status:400, message:"Bad Request", data:null});
                await con.rollback();
                return;
            }
            else{
                niin = select_medicInform_result[0].niin;
            }
            niin_arr.push(niin);
        }

    }
    else{
        for(let i=0; i<items.length; ++i){
            console.log("--------------------------");
            name = items[i].name;
            amount = items[i].amount;
            unit = items[i].unit;
            storagePlace = items[i].storagePlace;
            expirationDate = items[i].expirationDate;
			expirationDate = expirationDate.substr(0,10);
            property_id = name+"-"+expirationDate;
            property_id_arr.push(property_id);
            storagePlace_arr.push(storagePlace);
            amount_arr.push(amount);
            unit_arr.push(unit);
            console.log(property_id);
			//console.log("씨발 "+deleteLog_success);
            select_property_sql = "select * from property_"+militaryUnit+" where id = ?;";
            select_property_param = property_id;
            [select_property_result] = await con.query(select_property_sql, select_property_param);
            if(select_property_result.length==0){
			//	console.log("씨발 "+deleteLog_success);
				res.send({status:400, message:property_id+" 가 없습니다", data:null});
				await con.rollback();
                return;
            }
            else{   ////재산 테이블 수정 storagePlace도 수정
                var origin_total_amount = select_property_result[0].totalAmount;
                var finalAmount = origin_total_amount-amount;
				if(finalAmount<0){
					res.send({status:400, message:property_id+" 가 "+origin_total_amount+" 개 있는데 "+amount+" 개 빼려고 합니다", data:null});
                    await con.rollback();
                    return;
				}
                if(finalAmount==0){
                    delete_property_sql = "delete from property_"+militaryUnit+" where id = ?;";
                    delete_property_param = property_id;
                    delete_property_result = await myQuery(delete_property_sql, delete_property_param);
                    if(delete_property_result){
                        console.log(property_id+" property 테이블 삭제  성공");
                    }
                    else{
                        console.log(property_id+" property 테이블 삭제 실패");
						res.send({status:400, message:"Bad Request", data:null});
                    	await con.rollback();
                    	return;
                    }
                }
                else{
                    update_property_sql = "update property_"+militaryUnit+" set totalAmount = ?, updatedAt = now() where id = ?;";
                    update_property_param = [finalAmount, property_id];
                    update_property_result = await myQuery(update_property_sql, update_property_param);
                    console.log("사실여부 : "+update_property_result);
                    if(update_property_result){
                        console.log(property_id+" property 테이블 update 성공");
                    }
                    else{
                        console.log(property_id+" property 테이블 update 실패");
						res.send({status:400, message:"Bad Request", data:null});
                    	await con.rollback();
                    	return;
                    }
                }
                storagePlace_id = property_id+"-"+storagePlace;
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [property_id, storagePlace];
                console.log("스토리즈 플레이스 아이디 : "+select_storagePlace_param);
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                console.log("길이 : "+select_storagePlace_result.length);
                if(select_storagePlace_result.length==0){    //원래 그 약장함에 약이 없었음 => 에러
					res.send({status:400, message:storagePlace+" 엔 "+ property_id+" 가 없습니다", data:null});
					await con.rollback();
                    return;
                }
				else{   //원래 그 약장함에 약이 있었음 => update
                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount-amount;
					if(final_amount<0){
						res.send({status:400, message:storagePlace+" 에 "+property_id+" 가 "+origin_amount+" 개 있는데 "+amount+" 개 빼려고 합니다", data:null});
                    	await con.rollback();
                    	return;
					}
                    //console.log(origin_amount+" "+final_amount);
                    if(final_amount==0){
                        delete_storagePlace_sql = "delete from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                        delete_storagePlace_param = [property_id, storagePlace];
                        delete_storagePlace_result = await myQuery(delete_storagePlace_sql, delete_storagePlace_param);
                        if(delete_storagePlace_result){
                            console.log(property_id+" storagePlace 테이블 삭제  성공");
                        }
                        else{
                            console.log(property_id+" storagePlace 테이블 삭제 실패");
							res.send({status:400, message:"Bad Request", data:null});
                    		await con.rollback();
                    		return;
                        }
                    }
                    else{
                        update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                        update_storagePlace_param = [final_amount, property_id, storagePlace];
                        update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                        console.log(update_storagePlace_result);
                        if(update_storagePlace_result){
                            console.log(storagePlace_id+" storagePlace 테이블 update 성공");
                        }
                        else{
                            console.log(storagePlace_id+" storagePlace 테이블 update 실패");
							res.send({status:400, message:"Bad Request", data:null});
                    		await con.rollback();
                    		return;
                        }
                    }
                }
            }
        }
		var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
        var select_medicInform_param;
        for(let i=0; i<items.length; ++i){
            select_medicInform_param = items[i].name;
            var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
            if(select_medicInform_result.length==0){
                res.send({status:400, message:"Bad Request", data:null});
                await con.rollback();
                return;
            }
            else{
                niin = select_medicInform_result[0].niin;
            }
            niin_arr.push(niin);
        }
    }
/*
	for(let i=0; i<len; ++i){
		name_arr.push(items[i].name);
		unit_arr.push(items[i].unit);
		amount_arr.push(items[i].amount);
		expirationDate_arr.push(items[i].expirationDate);
		storagePlace_arr.push(items[i].storagePlace);
		property_id = items[i].name+"-"+items[i].expirationDate;
		property_id_arr.push(property_id);
    }
*/
    for(let i=0; i<len; ++i){
        str_property_id_arr+=property_id_arr[i];
        str_storagePlace_arr+=storagePlace_arr[i];
        str_amount_arr+=String(amount_arr[i]);
        str_unit_arr+=unit_arr[i];
        if(i<len-1){
            str_property_id_arr+="/";
            str_storagePlace_arr+="/";
            str_amount_arr+="/";
            str_unit_arr+="/";
        }
    }
	console.log(str_property_id_arr);
	console.log(str_amount_arr);
	console.log(str_unit_arr);
	var delete_paymentLog_sql = "delete from paymentLog_"+militaryUnit+" where id = ?;";
	var delete_paymentLog_param = log_id;
	var delete_success = await myQuery(delete_paymentLog_sql, delete_paymentLog_param);
	if(!delete_success){
		res.send({status:400, message:"Bad Request", data:null});
        await con.rollback();
        return;
	}
	var insert_log_sql = "insert into paymentLog_"+militaryUnit+" values (?,?,?,?,?,?,?,?,?,?,?, now());";
    var insert_log_param = [log_id, receiptPayment, confirmor_id, target ,YearMonthDate, log_num, str_property_id_arr, str_storagePlace_arr, str_amount_arr, str_unit_arr, createdAt];
    var insert_log_result = await myQuery(insert_log_sql, insert_log_param);
    if(!insert_log_result){
		res.send({status:400, message:"Bad Request", data:null});
        await con.rollback();
        return;
    }
    var select_user_sql = "select * from user where id = ?;";
    var select_user_param = confirmor_id;
    var [result] = await con.query(select_user_sql, select_user_param);
    if(result.length==0){
		res.send({status:400, message:"해당 confirmor 가 없습니다", data:null});
        await con.rollback();
        return;
    }
	var militaryUnit_blank = result[0].militaryUnit.replace(/_/g, " ");
    var confirmor = {id:result[0].id, name:result[0].name, email:result[0].email, phoneNumber:result[0].phoneNumber, serviceNumber:result[0].serviceNumber, rank:result[0].rank, enlistmentDate:result[0].enlistmentDate, dischargeDate:result[0].dischargeDate, militaryUnit:militaryUnit_blank,pictureName:result[0].pictureName, createdAt:result[0].createdAt, updatedAt:result[0].updatedAt};
    var check_time_sql = "select createdAt, updatedAt from paymentLog_"+militaryUnit+" where id = ?;";
    var check_time_param = log_id;
    var [time_result] = await con.query(check_time_sql, check_time_param);
    if(time_result.length==0){
		res.send({status:400, message:"Bad Request", data:null});
        await con.rollback();
        return;
    }
    var created_time = time_result[0].createdAt;
    var updated_time = time_result[0].updatedAt;
	for(let i=0; i<items.length; ++i){
        items[i].niin = niin_arr[i];
        console.log(niin_arr[i]);
        console.log(items[i].niin);
    }
    var data = {id:log_id, receiptPayment:receiptPayment, target:target, items:items, confirmor:confirmor, createdAt:created_time, updatedAt:updated_time};
    res.send({status:200, message:"Ok", data:data});
	await con.commit()
});


router.get('/', async function(req, res, next) {
/*	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
*/
	res.setHeader("Access-Control-Expose-Headers","*");

    con = await db.createConnection(inform); 
    //const my_id = req.body.id;

	const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
	res.setHeader("accessToken", new_access_token);
    res.setHeader("refreshToken", new_refresh_token);
	var my_id = verify_success.id;
    const check_militaryUnit = "select militaryUnit from user where id = ?;";
    const check_militaryUnit_param = my_id;
    const [check_militaryUnit_result] = await con.query(check_militaryUnit, check_militaryUnit_param);
    if(check_militaryUnit_result.length==0){
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
    var militaryUnit = check_militaryUnit_result[0].militaryUnit;
/*
    const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken,my_id);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
*/
    /*
    const accessToken = req.header('Authorization');
    if (accessToken == null) {
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
    var verify_success = await verify.verifyFunction(accessToken, my_id);
    if(!verify_success){
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
*/
    var select_log_sql = "select * from paymentLog_"+militaryUnit+" order by createdAt, log_num;";
    const [select_log_result, select_log_field] = await con.query(select_log_sql);
    if(select_log_result.length==0){
        res.send({status:400, message:"Bad Request"});
    }
    else{
		//var receiptPayment, confirmor_id, target, YearMonthDate, log_num, property_id_arr, storagePlace_arr, amount_arr, unit_arr, createdAt, updatedAt;
		//var arr_property_id, arr_storagePlace, 
		var data = [];
		for(let i=0; i<select_log_result.length; ++i){
			var id = select_log_result[i].id;
			var receiptPayment = select_log_result[i].receiptPayment;
        	var confirmor_id = select_log_result[i].confirmor_id;
        	var target = select_log_result[i].target;
        	var YearMonthDate = select_log_result[i].YearMonthDate;
        	var log_num = select_log_result[i].log_num;
        	var property_id_arr = select_log_result[i].property_id_arr;
        	var storagePlace_arr = select_log_result[i].storagePlace_arr;
        	var amount_arr = select_log_result[i].amount_arr;
        	var unit_arr = select_log_result[i].unit_arr;
       		var createdAt = select_log_result[i].createdAt;
        	var updatedAt = select_log_result[i].updatedAt;
        	var arr_property_id = property_id_arr.split('/');   ////////////////
        	var arr_storagePlace = storagePlace_arr.split('/'); ////////////////
        	var str_arr_amount = amount_arr.split('/');
        	var arr_unit = unit_arr.split('/');//////////////////
        	var arr_amount = [];    ////////////////////
        	var arr_name = [];  ///////////////////
        	var arr_expirationDate = [];    ///////////
        	var len = arr_property_id.length;
        	var getsu;
			for(let k=0; k<str_arr_amount.length; ++k){
            	getsu = parseInt(str_arr_amount[k]);
            	arr_amount.push(getsu);
        	}
        	var p_id;
        	for(let k=0; k<arr_property_id.length; ++k){
            	p_id = arr_property_id[k];
            	var id_split = p_id.split('-');
            	arr_name.push(id_split[0]);
            	var myexpirationDate = id_split[1]+"-"+id_split[2]+"-"+id_split[3];
            	arr_expirationDate.push(myexpirationDate);
        	}

			var niin_arr = [];
        	var niin, category;
        	var category_arr = [];
        	var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
        	var select_medicInform_param;
        	for(let k=0; k<arr_property_id.length; ++k){
            	select_medicInform_param = arr_name[k];
            	var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
            	if(select_medicInform_result.length==0){
                	res.send({status:400, message:"Bad Request", data:null});
                	return;
            	}
            	else{
                	niin = select_medicInform_result[0].niin;
                	category = select_medicInform_result[0].category;
            	}
				//console.log(niin);
				//console.log(category);
            	niin_arr.push(niin);
            	category_arr.push(category);
        	}
        	var items = [];
        	var individual_item;
        	for(let k=0; k<len; ++k){
            	individual_item = {name:arr_name[k], amount:arr_amount[k], unit:arr_unit[k],category:category_arr[k],niin:niin_arr[k], storagePlace:arr_storagePlace[k], expirationDate:arr_expirationDate[k]};
            	items.push(individual_item);
        	}
			var select_user_sql = "select * from user where id = ?;";
        	var select_user_param = confirmor_id;
        	const [select_user_result, select_user_field] = await con.query(select_user_sql, select_user_param);
			if(select_user_result.length==0){
         	   res.send({status:400, message:"Bad Request"});
				return;
        	}
			var user_name = select_user_result[0].name;
            var email = select_user_result[0].email;
            var phoneNumber = select_user_result[0].phoneNumber;
            var serviceNumber = select_user_result[0].serviceNumber;
            var rank = select_user_result[0].mil_rank;
            var enlistmentDate = select_user_result[0].enlistmentDate;
            var dischargeDate = select_user_result[0].dischargeDate;
            var militaryUnit = select_user_result[0].militaryUnit;
			var pictureName = select_user_result[0].pictureName;
            var user_createdAt = select_user_result[0].createdAt;
            var user_updatedAt = select_user_result[0].updatedAt;
			var militaryUnit_blank = militaryUnit.replace(/_/g, " ");	
            var user_data = {id:confirmor_id, name:user_name, email:email, phoneNumber:phoneNumber, serviceNumber:serviceNumber, rank:rank, enlistmentDate:enlistmentDate, dischargeDate:dischargeDate,militaryUnit:militaryUnit_blank,pictureName:pictureName, createdAt:user_createdAt, updatedAt:user_updatedAt };
            var individual_data = {id:id, receiptPayment:receiptPayment, target:target,items:items, confirmor:user_data, createdAt:createdAt, updatedAt:updatedAt};
            //res.send({status:200, message:"Ok", data:data});
			data.push(individual_data);
		}
		res.send({status:200, message:"Ok", data:data});
	}
});



router.get('/:id', async function(req, res, next) {
	/*res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
*/
	res.setHeader("Access-Control-Expose-Headers","*");

    con = await db.createConnection(inform);

	const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
	res.setHeader("accessToken", new_access_token);
    res.setHeader("refreshToken", new_refresh_token);
    var my_id = verify_success.id;
	
    const check_militaryUnit = "select militaryUnit from user where id = ?;";
    const check_militaryUnit_param = my_id;
    const [check_militaryUnit_result] = await con.query(check_militaryUnit, check_militaryUnit_param);
    if(check_militaryUnit_result.length==0){
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
    var militaryUnit = check_militaryUnit_result[0].militaryUnit;
/*
    const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken,my_id);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
*/
	/*
    const accessToken = req.header('Authorization');
    if (accessToken == null) {
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
    var verify_success = await verify.verifyFunction(accessToken, my_id);
    if(!verify_success){
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
*/
    var id = req.params.id;
    var select_log_sql = "select * from paymentLog_"+militaryUnit+" where id = ?;";
    var select_log_param = id;
    const [select_log_result, select_log_field] = await con.query(select_log_sql, select_log_param);
    if(select_log_result.length==0){
        res.send({status:400, message:"Bad Request"});
    }
    else{
        var receiptPayment = select_log_result[0].receiptPayment;
		var confirmor_id = select_log_result[0].confirmor_id;
        var target = select_log_result[0].target;
		var YearMonthDate = select_log_result[0].YearMonthDate;
		var log_num = select_log_result[0].log_num;
		var property_id_arr = select_log_result[0].property_id_arr;
		var storagePlace_arr = select_log_result[0].storagePlace_arr;
		var amount_arr = select_log_result[0].amount_arr;
		var unit_arr = select_log_result[0].unit_arr;
		var createdAt = select_log_result[0].createdAt;
		var updatedAt = select_log_result[0].updatedAt;
		//console.log(property_id_arr);
		//console.log(storagePlace_arr);
		//console.log(amount_arr);
		//console.log(unit_arr);
		var arr_property_id = property_id_arr.split('/');	////////////////
		var arr_storagePlace = storagePlace_arr.split('/'); ////////////////
		var str_arr_amount = amount_arr.split('/');
		var arr_unit = unit_arr.split('/');//////////////////
		var arr_amount = [];	////////////////////
		var arr_name = [];	///////////////////
		var arr_expirationDate = [];	///////////
		var len = arr_property_id.length;
		var getsu;
		for(let i=0; i<str_arr_amount.length; ++i){
            getsu = parseInt(str_arr_amount[i]);
			arr_amount.push(getsu);
        }
		var p_id;
		for(let i=0; i<arr_property_id.length; ++i){
            p_id = arr_property_id[i];
			var id_split = p_id.split('-');
			arr_name.push(id_split[0]);
			var myexpirationDate = id_split[1]+"-"+id_split[2]+"-"+id_split[3];
			arr_expirationDate.push(myexpirationDate);
        }
///////////////////////////////////////////////////////
		var niin_arr = [];
		var niin, category;
		var category_arr = [];
		var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
        var select_medicInform_param;
        for(let i=0; i<len; ++i){
            select_medicInform_param = arr_name[i];
            var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
            if(select_medicInform_result.length==0){
                res.send({status:400, message:"Bad Request", data:null});
                return;
            }
            else{
                niin = select_medicInform_result[0].niin;
				category = select_medicInform_result[0].category;
            }
            niin_arr.push(niin);
			category_arr.push(category);
        }
///////////////////////////////////////////////////////
		var items = [];
		var individual_item;
		for(let i=0; i<len; ++i){
			///////////////////////////////////////////////////////////////////////////////
			individual_item = {name:arr_name[i], amount:arr_amount[i], unit:arr_unit[i],category:category_arr[i], niin:niin_arr[i] , storagePlace:arr_storagePlace[i], expirationDate:arr_expirationDate[i]};
			items.push(individual_item);
		}	
        var select_user_sql = "select * from user where id = ?;";
        var select_user_param = confirmor_id;
        const [select_user_result, select_user_field] = await con.query(select_user_sql, select_user_param);
        if(select_user_result.length==0){
            res.send({status:400, message:"Bad Request"});
        }
        else{
            var user_name = select_user_result[0].name;
            var email = select_user_result[0].email;
            var phoneNumber = select_user_result[0].phoneNumber;
            var serviceNumber = select_user_result[0].serviceNumber;
            var rank = select_user_result[0].mil_rank;
            var enlistmentDate = select_user_result[0].enlistmentDate;
            var dischargeDate = select_user_result[0].dischargeDate;
            militaryUnit = select_user_result[0].militaryUnit;
			var pictureName = select_user_result[0].pictureName;
            var user_createdAt = select_user_result[0].createdAt;
            var user_updatedAt = select_user_result[0].updatedAt;
			var militaryUnit_blank = militaryUnit.replace(/_/g, " ");
            var user_data = {id:confirmor_id, name:user_name, email:email, phoneNumber:phoneNumber, serviceNumber:serviceNumber, rank:rank, enlistmentDate:enlistmentDate, dischargeDate:dischargeDate,militaryUnit:militaryUnit_blank,pictureName:pictureName, createdAt:user_createdAt, updatedAt:user_updatedAt };
            var data = {id:id, receiptPayment:receiptPayment, target:target,items:items, confirmor:user_data, createdAt:createdAt, updatedAt:updatedAt};
            res.send({status:200, message:"Ok", data:data});
        }
    }
});


router.post('/', async function(req, res, next) {
/*	
	res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
*/
	res.setHeader("Access-Control-Expose-Headers","*");

	con = await db.createConnection(inform);
	await con.beginTransaction();

	const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
	res.setHeader("accessToken", new_access_token);
    res.setHeader("refreshToken", new_refresh_token);
	var user_id = verify_success.id;
	var confirmor_id = req.body.confirmor;
	if(user_id!=confirmor_id){
		res.send({status:200, message:'본인 계정의 로그만 입력 가능합니다.', data:null});
        return;
	}

/*
    const accessToken = req.header('Authorization');
    if (accessToken == null) {
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
    var verify_success = await verify.verifyFunction(accessToken, confirmor_id);
    if(!verify_success){
        res.send({status:400, message:'Bad Request', data:null});
        return;
    }
*/
/*
    const accessToken = req.header('accessToken');
    const refreshToken = req.header('refreshToken');
    if (accessToken == null || refreshToken==null) {
        res.send({status:400, message:"토큰없음", data:null});
        return;
    }
    //console.log(accessToken+"  "+id);
    var verify_success = await verify.verifyFunction(accessToken,refreshToken,confirmor_id);
    if(!verify_success.success){
        res.send({status:400, message:verify_success.message, data:null});
        return;
    }
    var new_access_token = verify_success.accessToken;
    var new_refresh_token = verify_success.refreshToken;
*/
	const check_militaryUnit = "select militaryUnit from user where id = ?;";
    const check_militaryUnit_param = confirmor_id;
    const [check_militaryUnit_result] = await con.query(check_militaryUnit, check_militaryUnit_param);
    if(check_militaryUnit_result.length==0){
        res.send({status:400, message:'Bad Request', data:null});
		//await con.rollback();
        return;
    }
    var militaryUnit = check_militaryUnit_result[0].militaryUnit;
	const receiptPayment = req.body.receiptPayment;
	const target = req.body.target;
	const items = req.body.items;
	console.log(items);
	const curr = new Date();
	const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000);
	const KR_TIME_DIFF = 9*60*60*1000;
	const today = new Date(utc+KR_TIME_DIFF);
	var year = today.getFullYear();
	var month = today.getMonth()+1;
	var date = today.getDate();
	var hours = today.getHours();
	var minutes = today.getMinutes();
	var property_id, name, amount, unit,storagePlace, expirationDate;
    var storagePlace_id;
    var select_property_sql, select_property_param, select_property_result;
    var select_storagePlace_sql, select_storagePlace_param, select_storagePlace_result;
    var insert_property_sql, insert_property_param, insert_property_result;
    var insert_storagePlace_sql, insert_storagePlace_param, insert_storagePlace_result;
    var update_property_sql, update_property_param, update_property_result;
    var update_storagePlace_sql, update_storagePlace_param, update_storagePlace_result;
    var delete_property_sql, delete_property_param, delete_property_result;
    var delete_storagePlace_sql, delete_storagePlace_param, delete_storagePlace_result;
	//////////////////////////////////////////////////////////////////////////////////////////////////////////
	var property_id_arr = [];
	var storagePlace_arr = [];
	var amount_arr = [];
	var unit_arr = [];
	var category;
	var niin;
	var category_arr = [];
	var niin_arr = [];
	//const day = today.getDay();
	//console.log(year+"-"+month+"-"+date+"-"+hours+"-"+minutes);
	if(receiptPayment=="수입"){
		for(let i=0; i<items.length; ++i){
			console.log("--------------------------");
			name = items[i].name;
			amount = items[i].amount;
			unit = items[i].unit;
			storagePlace = items[i].storagePlace;
			expirationDate = items[i].expirationDate;
			expirationDate = expirationDate.substr(0,10);
			category = items[i].category;
			category_arr.push(category);
			property_id = name+"-"+expirationDate;
			property_id_arr.push(property_id);
			unit_arr.push(unit);
			storagePlace_arr.push(storagePlace);
			amount_arr.push(amount);
			console.log(property_id);
			select_property_sql = "select * from property_"+militaryUnit+" where id = ?;";
			select_property_param = property_id;
			[select_property_result] = await con.query(select_property_sql, select_property_param);
			if(select_property_result.length==0){	//새로 재산에 넣고 storagePlace에도 넣기 
				insert_property_sql = "insert into property_"+militaryUnit+" values (?,?,?,?,?,?,now(), now());";
				insert_property_param = [property_id,name,amount,unit,category,expirationDate];
				insert_property_result = await myQuery(insert_property_sql, insert_property_param);
				if(insert_property_result){
					console.log(property_id+" property 테이블 insert 성공");
				}
				else{
					console.log(property_id+" property 테이블 insert 실패");
					res.send({status:400, message:"Bad Request", data:null});
					await con.rollback();
					return;
				}
				storagePlace_id = property_id+"-"+storagePlace;
				insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                insert_storagePlace_param = [storagePlace_id,property_id,storagePlace,amount,unit];
                insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
				if(insert_storagePlace_result){
                    console.log(storagePlace_id+" storagePlace 테이블 insert 성공");
                }
                else{
                    console.log(storagePlace_id+" storagePlace 테이블 insert 실패");
					res.send({status:400, message:"Bad Request", data:null});
                    await con.rollback();
                    return;
                }
			}
			else{	////재산 테이블 수정 storagePlace도 수정
				var origin_total_amount = select_property_result[0].totalAmount;
				var finalAmount = origin_total_amount+amount;
				//console.log(finalAmount+" 씨발");
				update_property_sql = "update property_"+militaryUnit+" set totalAmount = ?, updatedAt = now() where id = ?;";
                update_property_param = [finalAmount, property_id];
                update_property_result = await myQuery(update_property_sql, update_property_param);
                if(update_property_result){
                    console.log(property_id+" property 테이블 update 성공");
                }
                else{
                    console.log(property_id+" property 테이블 update 실패");
					res.send({status:400, message:"Bad Request", data:null});
                    await con.rollback();
                    return;
                }
                storagePlace_id = property_id+"-"+storagePlace;
				select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
				select_storagePlace_param = [property_id,storagePlace] ;
				console.log("스토리즈 플레이스 아이디 : "+select_storagePlace_param);
				[select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
				console.log("길이 : "+select_storagePlace_result.length);
				if(select_storagePlace_result.length==0){	 //원래 그 약장함에 약이 없었음 => insert 
					console.log(storagePlace+" 에 "+property_id+" 약이 없었으니까 insert 함");
					insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                	insert_storagePlace_param = [storagePlace_id,property_id,storagePlace,amount,unit];
                	insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                	if(insert_storagePlace_result){
                   		console.log(storagePlace_id+" storagePlace 테이블 insert 성공");
                	}
                	else{
                    	console.log(storagePlace_id+" storagePlace 테이블 insert 실패");
						res.send({status:400, message:"Bad Request", data:null});
                    	await con.rollback();
                    	return;
                	}
				}
				else{	//원래 그 약장함에 약이 있었음 => update
					
					var origin_amount = select_storagePlace_result[0].amount;
					var final_amount = origin_amount+amount;
					console.log(origin_amount+" "+final_amount);
					update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                    update_storagePlace_param = [final_amount, property_id, storagePlace];
                   	update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                    if(update_storagePlace_result){
                        console.log(storagePlace_id+" storagePlace 테이블 update 성공");
                    }
                    else{
                        console.log(storagePlace_id+" storagePlace 테이블 update 실패");
						res.send({status:400, message:"Bad Request", data:null});
                    	await con.rollback();
                    	return;
                    }
				}
			}
		}
		var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
		var select_medicInform_param; 
		for(let i=0; i<items.length; ++i){
			select_medicInform_param = items[i].name;
			var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
			if(select_medicInform_result.length==0){
				var new_niin = Math.random().toString(36).substring(2, 12); 
				niin = new_niin;
				var insert_medicInform_sql = "insert into medicInform_"+militaryUnit+" values (?,?,?);"
        		var insert_medicInform_param = [items[i].name, items[i].category, new_niin];
				var insert_medicInform_success = await myQuery(insert_medicInform_sql, insert_medicInform_param);
				if(!insert_medicInform_success){
					res.send({status:400, message:"Bad Request", data:null});
                    await con.rollback();
                    return;
				}
			}
			else{
				niin = select_medicInform_result[0].niin;
			}
			console.log("씨발"+niin);
			niin_arr.push(niin);
		}			
	}
	else if(receiptPayment=="이동"){
		for(let i=0; i<items.length; ++i){
            console.log("--------------------------");
            name = items[i].name;
            amount = items[i].amount;
            unit = items[i].unit;
            storagePlace = items[i].storagePlace;
            expirationDate = items[i].expirationDate;
			expirationDate = expirationDate.substr(0,10);
            property_id = name+"-"+expirationDate;
			property_id_arr.push(property_id);
            storagePlace_arr.push(storagePlace);
			unit_arr.push(unit);
            amount_arr.push(amount);
            console.log(property_id);
            select_property_sql = "select * from property_"+militaryUnit+" where id = ?;";
            select_property_param = property_id;
            [select_property_result] = await con.query(select_property_sql, select_property_param);
            if(select_property_result.length==0){
				res.send({status:400, message:"Bad Request", data:null});
                await con.rollback();
                return;
            }
            else{   ////재산 테이블 수정할필요가 없음 바로 storagePlace 수정
                storagePlace_id = property_id+"-"+storagePlace;
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [property_id, storagePlace];
                console.log("스토리즈 플레이스 아이디 : "+select_storagePlace_param);
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                console.log("길이 : "+select_storagePlace_result.length);
                if(select_storagePlace_result.length==0){    //원래 그 약장함에 약이 없었음 => 에러
                    res.send({status:400, message:storagePlace+" 엔 "+ property_id+" 가 없습니다", data:null});
					await con.rollback();
					return;
                }
				else{   
                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount-amount;
					if(final_amount<0){
						res.send({status:400, message:storagePlace+" 에 "+property_id+" 가 "+origin_amount+" 개 있는데 "+amount+" 개 빼려고 합니다", data:null});
                    	await con.rollback();
                    	return;
					}
                    //console.log(origin_amount+" "+final_amount);
                    if(final_amount==0){
                        delete_storagePlace_sql = "delete from storagePlace_"+militaryUnit+" where id = ?;";
                        delete_storagePlace_param = storagePlace_id;
                        delete_storagePlace_result = await myQuery(delete_storagePlace_sql, delete_storagePlace_param);
                        if(delete_storagePlace_result){
                            console.log(property_id+" storagePlace 테이블 삭제  성공");
                        }
                        else{
                            console.log(property_id+" storagePlace 테이블 삭제 실패");
							res.send({status:400, message:"Bad Request", data:null});
                    		await con.rollback();
                    		return;
                        }
                    }
                    else{
                        update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where id = ?;";
                        update_storagePlace_param = [final_amount, storagePlace_id];
                        update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                        console.log(update_storagePlace_result);
                        if(update_storagePlace_result){
                            console.log(storagePlace_id+" storagePlace 테이블 update 성공");
                        }
                        else{
							res.send({status:400, message:"Bad Request", data:null});
							await con.rollback();
							return;
                        }
                    }
                }
				storagePlace_id = property_id+"-"+target;
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [property_id, target];
				[select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
				console.log(select_storagePlace_result[0]);
				if(select_storagePlace_result.length==0){    //원래 그 약장함에 약이 없었음 => insert
                    //console.log(storagePlace+" 에 "+property_id+" 약이 없었으니까 insert 함");
                    insert_storagePlace_sql = "insert into storagePlace_"+militaryUnit+" values (?,?,?,?,?);";
                    insert_storagePlace_param = [storagePlace_id,property_id,target,amount,unit];
                    insert_storagePlace_result = await myQuery(insert_storagePlace_sql, insert_storagePlace_param);
                    if(insert_storagePlace_result){
                        console.log(storagePlace_id+" storagePlace 테이블 insert 성공");
                    }
                    else{
						res.send({status:400, message:"Bad Request", data:null});
                        await con.rollback();
                        return;
                    }
                }
                else{   //원래 그 약장함에 약이 있었음 => update

                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount+amount;
                    console.log(origin_amount+" "+final_amount);
                    update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                    update_storagePlace_param = [final_amount, property_id, target];
                    update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                    if(update_storagePlace_result){
                        console.log(storagePlace_id+" storagePlace 테이블 update 성공");
                    }
                    else{
						res.send({status:400, message:"Bad Request", data:null});
                        await con.rollback();
                        return;
                    }
                }
            }
        }
		var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
        var select_medicInform_param;
        for(let i=0; i<items.length; ++i){
            select_medicInform_param = items[i].name;
			var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
            if(select_medicInform_result.length==0){
                res.send({status:400, message:"Bad Request", data:null});
                await con.rollback();
                return;
            }
            else{
                niin = select_medicInform_result[0].niin;
            }
            niin_arr.push(niin);
        }
		
	}
	else{
        for(let i=0; i<items.length; ++i){
            console.log("--------------------------");
            name = items[i].name;
            amount = items[i].amount;
            unit = items[i].unit;
            storagePlace = items[i].storagePlace;
            expirationDate = items[i].expirationDate;
			expirationDate = expirationDate.substr(0,10);
            property_id = name+"-"+expirationDate;
			property_id_arr.push(property_id);
            storagePlace_arr.push(storagePlace);
            amount_arr.push(amount);
			unit_arr.push(unit);
            console.log(property_id);
            select_property_sql = "select * from property_"+militaryUnit+" where id = ?;";
            select_property_param = property_id;
            [select_property_result] = await con.query(select_property_sql, select_property_param);
            if(select_property_result.length==0){ 
				res.send({status:400, message:property_id+" 가 없습니다", data:null});
				await con.rollback();
				return;
            }
			else{   ////재산 테이블 수정 storagePlace도 수정
                var origin_total_amount = select_property_result[0].totalAmount;
                var finalAmount = origin_total_amount-amount;
				if(finalAmount<0){
					res.send({status:400, message:property_id+" 가 "+origin_total_amount+" 개 있는데 "+amount+" 개 빼려고 합니다", data:null});
                    await con.rollback();
                    return;
				}
				if(finalAmount==0){
					delete_property_sql = "delete from property_"+militaryUnit+" where id = ?;";
                    delete_property_param = property_id;
                    delete_property_result = await myQuery(delete_property_sql, delete_property_param);
                    if(delete_property_result){
                        console.log(property_id+" property 테이블 삭제  성공");
                    }
                    else{
						res.send({status:400, message:"Bad Request", data:null});
                		await con.rollback();
                		return;
                    }	
				}
				else{
					update_property_sql = "update property_"+militaryUnit+" set totalAmount = ?, updatedAt = now() where id = ?;";
                	update_property_param = [finalAmount, property_id];
                	update_property_result = await myQuery(update_property_sql, update_property_param);
                	//console.log("사실여부 : "+update_property_result);
                	if(update_property_result){
                    	console.log(property_id+" property 테이블 update 성공");
                	}
                	else{
						res.send({status:400, message:"Bad Request", data:null});
                		await con.rollback();
                		return;
                	}
				}
                storagePlace_id = property_id+"-"+storagePlace;
                select_storagePlace_sql = "select * from storagePlace_"+militaryUnit+" where property_id = ? and name = ?;";
                select_storagePlace_param = [property_id, storagePlace];
                console.log("스토리즈 플레이스 아이디 : "+select_storagePlace_param);
                [select_storagePlace_result] = await con.query(select_storagePlace_sql, select_storagePlace_param);
                console.log("길이 : "+select_storagePlace_result.length);
                if(select_storagePlace_result.length==0){    //원래 그 약장함에 약이 없었음 => 에러
					res.send({status:400, message:storagePlace+" 엔 "+ property_id+" 가 없습니다", data:null});
                	await con.rollback();
					return;
				}
	/////////////////////
                else{   //원래 그 약장함에 약이 있었음 => update
                    var origin_amount = select_storagePlace_result[0].amount;
                    var final_amount = origin_amount-amount;
					if(final_amount<0){
						res.send({status:400, message:storagePlace+" 에 "+property_id+" 가 "+origin_amount+" 개 있는데 "+amount+" 개 빼려고 합니다", data:null});
                    	await con.rollback();
                    	return;
					}
                    //console.log(origin_amount+" "+final_amount);
					if(final_amount==0){
						delete_storagePlace_sql = "delete from storagePlace_"+militaryUnit+" where id = ?;";
                    	delete_storagePlace_param = storagePlace_id;
                    	delete_storagePlace_result = await myQuery(delete_storagePlace_sql, delete_storagePlace_param);
                    	if(delete_storagePlace_result){
                        	console.log(property_id+" storagePlace 테이블 삭제  성공");
                    	}
                    	else{
							res.send({status:400, message:"Bad Request", data:null});
                    		await con.rollback();
                    		return;
                    	}
					}
					else{
						update_storagePlace_sql = "update storagePlace_"+militaryUnit+" set amount = ? where property_id = ? and name = ?;";
                    	update_storagePlace_param = [final_amount, property_id, storagePlace];
                    	update_storagePlace_result = await myQuery(update_storagePlace_sql, update_storagePlace_param);
                    	console.log(update_storagePlace_result);
                    	if(update_storagePlace_result){
                        	console.log(storagePlace_id+" storagePlace 테이블 update 성공");
                    	}
                    	else{
							res.send({status:400, message:"Bad Request", data:null});
                            await con.rollback();
                            return;
                    	}
					}
                }
            }
        }
		var select_medicInform_sql = "select * from medicInform_"+militaryUnit+" where name = ?;";
        var select_medicInform_param;
        for(let i=0; i<items.length; ++i){
            select_medicInform_param = items[i].name;
			var [select_medicInform_result] = await con.query(select_medicInform_sql, select_medicInform_param);
            if(select_medicInform_result.length==0){
                res.send({status:400, message:"Bad Request", data:null});
                await con.rollback();
                return;
            }
            else{
                niin = select_medicInform_result[0].niin;
            }
            niin_arr.push(niin);
        }
	}
	////////
	var str_property_id_arr = "";
	var str_storagePlace_arr = "";
	var str_amount_arr = "";
	var str_unit_arr = "";
	var len = property_id_arr.length;
	for(let i=0; i<len; ++i){
		str_property_id_arr+=property_id_arr[i];
		str_storagePlace_arr+=storagePlace_arr[i];
		str_amount_arr+=String(amount_arr[i]);
		str_unit_arr+=unit_arr[i];
		if(i<len-1){
			str_property_id_arr+="/";
        	str_storagePlace_arr+="/";
        	str_amount_arr+="/";
			str_unit_arr+="/";
		}
	}
	console.log(str_property_id_arr);
	console.log(str_storagePlace_arr);
	console.log(str_amount_arr);
	var now = year+"-"+month+"-"+date;
	console.log(now);
	var select_now_sql = "select * from paymentLog_"+militaryUnit+" where YearMonthDate = ? order by log_num asc;";
	var select_now_param = now;
	var[select_now_result, select_now_param] = await con.query(select_now_sql, select_now_param);
	var log_id, nextnum;
	if(select_now_result.length==0){
		log_id = now+"-1";
		nextnum = 1;
	}
	else{
		nextnum = select_now_result[select_now_result.length-1].log_num+1;
		log_id = now+"-"+String(nextnum);
	}
	var insert_log_sql = "insert into paymentLog_"+militaryUnit+" values (?,?,?,?,?,?,?,?,?,?,now(), now());";
	var insert_log_param = [log_id, receiptPayment, confirmor_id, target ,now, nextnum, str_property_id_arr, str_storagePlace_arr, str_amount_arr, str_unit_arr];
	var insert_log_result = await myQuery(insert_log_sql, insert_log_param);
	if(!insert_log_result){
		res.send({status:400, message:"Bad Request", data:null});
        await con.rollback();
        return;
	}
	var select_user_sql = "select * from user where id = ?;";
	var select_user_param = confirmor_id;
	var [result] = await con.query(select_user_sql, select_user_param);
	if(result.length==0){
		res.send({status:400, message:"Bad Request", data:null});
        await con.rollback();
		return;
	}
	var militaryUnit_blank = result[0].militaryUnit.replace(/_/g, " ");	
	var confirmor = {id:result[0].id, name:result[0].name, email:result[0].email, phoneNumber:result[0].phoneNumber, serviceNumber:result[0].serviceNumber, rank:result[0].rank, enlistmentDate:result[0].enlistmentDate, dischargeDate:result[0].dischargeDate, militaryUnit:militaryUnit_blank,pictureName:result[0].pictureName, createdAt:result[0].createdAt, updatedAt:result[0].updatedAt};
	var check_time_sql = "select createdAt, updatedAt from paymentLog_"+militaryUnit+" where id = ?;";
    var check_time_param = log_id;
    var [time_result] = await con.query(check_time_sql, check_time_param);
	if(time_result.length==0){
		res.send({status:400, message:"Bad Request", data:null});
        await con.rollback();
        return;
    }
	var created_time = time_result[0].createdAt;
	var updated_time = time_result[0].updatedAt;
	for(let i=0; i<items.length; ++i){
		items[i].niin = niin_arr[i];
		console.log(niin_arr[i]);
		console.log(items[i].niin);
	}
	var data = {id:log_id, receiptPayment:receiptPayment, target:target, items:items, confirmor:confirmor, createdAt:created_time, updatedAt:updated_time};
	res.send({status:200, message:"Ok", data:data});
	await con.commit();

	//오늘날짜로 yearmonthdate 조회해서 없으면 1번부터, 있으면 마지막+1 로 아이디 만들고 나머지거 insert하기
});



module.exports = router;
