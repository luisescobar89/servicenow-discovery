new DiscoverySensor( {
   process: function(result) {
      var snmp = new SNMPResponse(result);
    
	var nic_serial = snmp.getOIDText('iso.org.dod.internet.private.enterprises.serverTech.sentry3.systemGroup.systemNICSerialNumber'); 
	var firmware_version = snmp.getOIDText('iso.org.dod.internet.private.enterprises.serverTech.sentry3.systemGroup.systemVersion');
	var name = snmp.getOIDText('iso.org.dod.internet.private.enterprises.serverTech.sentry3.systemGroup.systemLocation');
	var tower_count = snmp.getOIDText('iso.org.dod.internet.private.enterprises.serverTech.sentry3.systemGroup.systemTowerCount');
	var envMonitors = snmp.getOIDText('iso.org.dod.internet.private.enterprises.serverTech.sentry3.systemGroup.systemEnvMonCount');

	   
	   var outlets = [];
	   var towers = [];
	   
	   

		var oid_sentry3 = 'iso.org.dod.internet.private.enterprises.serverTech.sentry3.';
		var outlet_list = snmp.getOIDTable(oid_sentry3 + 'systemTables', 'outletEntry');
		var tower_list = snmp.getOIDTable(oid_sentry3 + 'systemTables', 'towerEntry');
	   
	   
	   
	for (var tower_index in tower_list){
	   
	var tower_array = ({'u_tower_id':(tower_list[tower_index]['towerID']), 'name':(tower_list[tower_index]['towerName']), 'u_state':(tower_list[tower_index]['towerStatus']), 'serial_number':(tower_list[tower_index]['towerProductSN']), 'model_number':(tower_list[tower_index]['towerModelNumber'])});
		
		//set tower state
		if(tower_array.u_state == 0){
			tower_array.u_state = "normal";
			      
		}
		else if(tower_array.u_state == 1){
			tower_array.u_state = "noComm";
			   
		}
		else if(tower_array.u_state == 2){
			tower_array.u_state = "fanFail";
			   
		}		   
		else if(tower_array.u_state == 3){
			tower_array.u_state = "overTemp";
			   
		}		
		else if(tower_array.u_state == 4){
			tower_array.u_state = "nvmFail";
			   
		}		   
		else if(tower_array.u_state == 5){
			tower_array.u_state = "outOfBalance";
			   
		} 
		   
			towers.push(tower_array);
		   
	}
	   
	   
	for (var index in outlet_list){

		var outlet_array = ({'u_outlet_id':(outlet_list[index]['outletID']), 'name':(outlet_list[index]['outletName']), 'u_status':(outlet_list[index]['outletStatus'])});
		   
		// add 0 between letter and numbers 1-9 in outlet ID
		var outlet_id_number = parseInt(outlet_array.u_outlet_id.replace(/\D/g,''));
		var outlet_id_letter = outlet_array.u_outlet_id.replace(/[0-9]/g, '');	  
		outlet_array.u_outlet_id = outlet_id_letter + ('0' + outlet_id_number).slice(-2);
		   
	//get tower name
	for (tower_index in tower_list){
		   		   
		var outlet_tower_array = ({'u_tower_name':(tower_list[tower_index]['towerName'])});
	   
		  // assign tower name to outlets
			if (outlet_array.u_outlet_id.indexOf('A') == 0 && outlet_tower_array.u_tower_name == "TowerA"){
				outlet_array.u_tower_name = "TowerA";
			}
			else if(outlet_array.u_outlet_id.indexOf('B') == 0 && outlet_tower_array.u_tower_name == "TowerB"){
				outlet_array.u_tower_name = "TowerB";
			   
			}	
			else if(outlet_array.u_outlet_id.indexOf('A') == 0 && outlet_tower_array.u_tower_name == "Master"){
				outlet_array.u_tower_name = "Master";
			   
			}
			else if(outlet_array.u_outlet_id.indexOf('B') == 0 && outlet_tower_array.u_tower_name == "Link"){
				outlet_array.u_tower_name = "Link";
			   
			}

	}  
	
			//assign outlet state
		   if(outlet_array.u_status == 0){
				outlet_array.u_status = "off";
			      
		   }
		   else if(outlet_array.u_status == 1){
				outlet_array.u_status = "on";
			   
		   }
		   else if(outlet_array.u_status == 2){
				outlet_array.u_status = "offWait";
			   
		   }		   
		   else if(outlet_array.u_status == 3){
				outlet_array.u_status = "onWait";
			   
		   }		
		   else if(outlet_array.u_status == 4){
				outlet_array.u_status = "offError";
			   
		   }		   
		   else if(outlet_array.u_status == 5){
				outlet_array.u_status = "OnError";
			   
		   }
		   else if(outlet_array.u_status == 6){
				outlet_array.u_status = "noComm";
			   
		   }		   
		   else if(outlet_array.u_status == 7){
				outlet_array.u_status = "reading";
			   
		   }	
		   else if(outlet_array.u_status == 8){
				outlet_array.u_status = "offFuse";
			   
		   }	
		   else if(outlet_array.u_status == 9){
				outlet_array.u_status = "onFuse";
			   
		   }	
		   

		// for outlets that have a NULL name set their value to undefined
		if(outlet_array.name == null){
			outlet_array.name = "undefined";
			   
		}

		   outlets.push(outlet_array);

	}	   
   

		var num_outlets = outlets.length;
		var man = "Server Tech";
	    var model = "Sentry Switched CDU 3";
		var mm = MakeAndModelJS.fromNames(man,model,'hardware');
	    firmware_version = firmware_version.replace(/Sentry Switched CDU Version /gi, "");
	   
	    current.u_tower_count = tower_count;
		current.serial_number = nic_serial;
	    current.name = name;
	    current.u_firmware_version = firmware_version;
	    current.u_outlet_count = num_outlets;
	    current.u_envmonitors = envMonitors;
	    current.manufacturer = mm.getManufacturerSysID();  
        current.model_id = mm.getModelNameSysID();  
		
		JSUtil.logObject(outlets);
		JSUtil.logObject(towers);
		gs.log("Serial is: " + nic_serial);
	    gs.log("Model is: " + model);
	    gs.log("Num Outlets is: " + num_outlets);
	  
	   
	this.addToRelatedList('u_cmdb_ci_sentry_pdu_outlet', outlets, 'u_cmdb_ci_sentry_pdu', 'name');  
	this.addToRelatedList('u_cmdb_ci_sentry_pdu_tower', towers, 'u_cmdb_ci_sentry_pdu', 'name');  

	   

	},
	   
	   
		     
   type: "DiscoverySensor"
});