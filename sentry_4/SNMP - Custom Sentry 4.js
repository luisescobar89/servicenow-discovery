new DiscoverySensor( {
   process: function(result) {
      var snmp = new SNMPResponse(result);
	   
			var oid_sentry4 = 'iso.org.dod.internet.private.enterprises.serverTech.sentry4.';	   
			var firmware_version = snmp.getOIDText(oid_sentry4 + 'st4Objects.st4System.st4SystemConfig.st4SystemFirmwareVersion');	  
			var nic_serial = snmp.getOIDText(oid_sentry4 + 'st4Objects.st4System.st4SystemConfig.st4SystemNICSerialNumber'); 
			var nicHardwareInfo = snmp.getOIDText(oid_sentry4 + 'st4Objects.st4System.st4SystemConfig.st4SystemNICHardwareInfo');    
			var unitCount = snmp.getOIDText(oid_sentry4 + 'st4Objects.st4System.st4SystemConfig.st4SystemUnitCount'); 
		   	   
			var outlets = [];
		    var units = [];
		   
			var outlet_list = snmp.getOIDTable(oid_sentry4 + 'st4Objects.st4Outlets', 'st4OutletConfigEntry');
			var outlet_status = snmp.getOIDTable(oid_sentry4 + 'st4Objects.st4Outlets', 'st4OutletMonitorEntry'); 
		    var unit_list = snmp.getOIDTable(oid_sentry4 + 'st4Objects.st4Units', 'st4UnitConfigEntry');
			var unit_status = snmp.getOIDTable(oid_sentry4 + 'st4Objects.st4Units', 'st4UnitMonitorEntry');
	   
	   
	   
	for (var unit_index in unit_list){

			var unit_array = ({'u_unit_id':(unit_list[unit_index]['st4UnitID']), 'name':(unit_list[unit_index]['st4UnitName']), 'serial_number':(unit_list[unit_index]['st4UnitProductSN']), 'model_number':(unit_list[unit_index]['st4UnitModel'])});
		
	
			
		for (var unit_status_index in unit_status){
		   		   
			var unit_status_array = ({'u_status':(unit_status[unit_status_index]['st4UnitStatus'])});
			
			if (unit_status_array.u_status == "0"){
				unit_array.u_status = "normal";
			}
	   
		}
			
			units.push(unit_array);
	}
	   
	for (var index in outlet_list){

			var outlet_array = ({'u_outlet_id':(outlet_list[index]['st4OutletID']), 'name':(outlet_list[index]['st4OutletName'])});
		
		// add 0 between letter and numbers 1-9 in outlet ID
			var outlet_id_number = parseInt(outlet_array.u_outlet_id.replace(/\D/g,''));
			var outlet_id_letter = outlet_array.u_outlet_id.replace(/[0-9]/g, '');	  
			outlet_array.u_outlet_id = outlet_id_letter + ('0' + outlet_id_number).slice(-2);
			
		//get outlet status
		for (var outlet_status_index in outlet_status){
		   		   
			var outlet_status_array = ({'u_status':(outlet_status[outlet_status_index]['st4OutletStatus'])});
			
			if (outlet_status_array.u_status == "0"){
				outlet_array.u_status = "on";
			}
	   
		}
		
	//get unit name
	for (index in unit_list){
		   		   
		var outlet_unit_array = ({'u_unit_name':(unit_list[index]['st4UnitName'])});
	   
		  // assign tower name to outlets
			if (outlet_array.u_outlet_id.indexOf('A') == 0){
				outlet_array.u_tower_name = "Master";
			}
			
		if(outlet_array.u_outlet_id.indexOf('B') == 0){
				outlet_array.u_tower_name = "Link1";
			   
			}	
	

	}  
			
			outlets.push(outlet_array);
	}
	   
	   
	   
	   JSUtil.logObject(outlets);
	   JSUtil.logObject(units);
	   
		   var man = "Server Tech";
		   var model = "Sentry Switched CDU 4";
		   var mm = MakeAndModelJS.fromNames(man,model,'hardware');
		   firmware_version = firmware_version.replace(/Version/gi, "");
		   
		   current.model_id = mm.getModelNameSysID();
		   current.u_firmware_version = firmware_version;
		   current.serial_number = nic_serial;
		   current.u_nic_hardware_info = nicHardwareInfo;
		   current.u_unit_count = unitCount;
		   
		   var num_outlets = outlets.length;
		   current.u_outlet_count = num_outlets;
	   
	   
	   
	   this.addToRelatedList('u_cmdb_ci_sentry_pdu_outlet', outlets, 'u_cmdb_ci_sentry_pdu', 'name');  
	   this.addToRelatedList('u_cmdb_ci_sentry_pdu_unit', units, 'u_cmdb_ci_sentry_pdu', 'name'); 
	   
	   
	   
	},
	   
	   
		     
   type: "DiscoverySensor"
});