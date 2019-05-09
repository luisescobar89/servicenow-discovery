// Discovery
/**
 * Parses the 'SNMP - Identity Info' MultiProbe result, adding generic NICs and serial numbers to the passed CIData object.
 */
var SnmpIdentityInfoParser = Class.create();
SnmpIdentityInfoParser.prototype = {
	/**
	 * @param CIData ciData The CIData object to append data to.
	 */
    initialize: function(ciData) {
		this.ciData = ciData;
		this.serials = ciData.addRelatedList('cmdb_serial_number', 'cmdb_ci');
		this.nics = ciData.addRelatedList('cmdb_ci_network_adapter', 'cmdb_ci');
    },

	/**
	 * @param string result The XML probe response.
	 */
	process: function(result) {
		var snmp = new SNMPResponse(result);
		var oid_mib2    = 'iso.org.dod.internet.mgmt.mib-2.';
		var oid_apc     = 'iso.org.dod.internet.private.enterprises.apc.';
		var oid_novell  = 'iso.org.dod.internet.private.enterprises.novell.';
		var oid_cisco   = 'iso.org.dod.internet.private.enterprises.cisco.';
		var oid_foundry = 'iso.org.dod.internet.private.enterprises.foundry.';
		var oid_hrSystem    = oid_mib2 + 'host.hrSystem.';
		var oid_dot1dBridge = oid_mib2 + 'dot1dBridge.';
		var oid_interfaces  = oid_mib2 + 'interfaces';
		var oid_ip          = oid_mib2 + 'ip';
		var oid_ipv6        = oid_mib2 + 'ipv6MIB.ipv6MIBObjects';
		var oid_ups         = oid_mib2 + 'upsMIB.';
		var oid_system      = oid_mib2 + 'system.';
		var oid_entity      = oid_mib2 + 'entityMIB.';
		var oid_printer     = oid_mib2 + 'printmib.';
		var oid_sentry3 = 'iso.org.dod.internet.private.enterprises.serverTech.sentry3.'; //Highmetric Customization
		var oid_sentry4 = 'iso.org.dod.internet.private.enterprises.serverTech.sentry4.'; //Highmetric Customization
		
		// get any serial numbers we might have...
		// first we look in the entity MIB, as this is the most generic place it might be...
		var physObjs = snmp.getOIDTable(oid_entity + 'entityMIBObjects.entityPhysical', 'entPhysicalEntry');
		if(physObjs != null) {
			for(var instance in physObjs) {
				if (physObjs[instance]['entPhysicalContainedIn'] === 0 && JSUtil.notNil(physObjs[instance]['entPhysicalSerialNum'])) {
					this.addSerial('physical', physObjs[instance]['entPhysicalSerialNum']);
					break;
				}
			}
		}
		
		// see if we can find a Cisco serial in the Cisco Stack MIB...
		this.addSerial('cisco_stack', snmp.getOIDText(oid_cisco + 'workgroup.ciscoStackMIB.chassisGrp.chassisSerialNumberString'));
		
		// our last resort for Cisco is their old MIB; note that this value is overwritten by this IOS line:
		// snmp-server chassis-id xxxx
		// so we use this only if we have to, as it may be tainted by the touch of humans...
		this.addSerial('cisco_chassis', snmp.getOIDText(oid_cisco + 'temporary.chassis.chassisId'));
		
		// if this wasn't a Cisco device, let's see if it was a Foundry device...
		this.addSerial('foundry', snmp.getOIDText(oid_foundry + 'products.switch.snChassis.snChasGen.snChasSerNum'));
		
		// if this was an APC PDU 
		this.addSerial('apc_pdu', snmp.getOIDText(oid_apc + 'products.hardware.masterswitch.sPDUIdent.sPDUIdentSerialNumber') );
		
		// if this was a Sentry3 PDU (Highmeric Customization)
		this.addSerial('sentry3_pdu', snmp.getOIDText(oid_sentry3 + 'systemGroup.systemNICSerialNumber') );
		
		// if this was a Sentry4 PDU (Highmeric Customization)
		this.addSerial('sentry4_pdu', snmp.getOIDText(oid_sentry4 + 'st4Objects.st4System.st4SystemConfig.st4SystemNICSerialNumber') );
		
		// if there was no serial number otherwise, then maybe we've got a printer here...
		var printerGen = snmp.getOIDTable(oid_printer + 'prtGeneral', 'prtGeneralEntry');
		if ((printerGen != null) && (typeof printerGen['1'] != 'undefined'))
			this.addSerial('printer', printerGen['1']['prtGeneralSerialNumber']);
		
		// let's see if we've got an APC UPS here, with its very own serial number...
		this.addSerial('standard', snmp.getOIDText(oid_apc + 'products.hardware.ups.upsIdent.upsAdvIdent.upsAdvIdentSerialNumber'));
		
		// now let's get the network information...
		var ips   = snmp.getOIDTable(oid_ip, 'ipAddrEntry');
		var ipv6s = snmp.getOIDTable(oid_ipv6, 'ipv6AddrEntry');
		var ifs   = snmp.getOIDTable(oid_interfaces, 'ifEntry');
		for (var index in ifs) {
			var if_entry = ifs[index];
	
			// We do not wanna record loopback interface type (http://oid-info.com/get/1.3.6.1.2.1.2.2.1.3)
			if (if_entry['ifType'] == 24)
				continue;
			
			/* According to the this article
			*  http://tools.cisco.com/Support/SNMP/do/BrowseOID.do?local=en&translate=Translate&objectInput=1.3.6.1.2.1.2.2.1.8#oidContent
			*  The "ifOperStatus" should follow the "ifAdminStatus". However, it's apparent that there are cases where the ifOperStatus is 2 while 
			*  the ifAdminStatus is 1. Moreoever, there's actually an IP address associated with it. It's only reasonable to assume that ifOperStatus
			*  is not a reliable way to determine whether a NIC should be recorded.
			*/		
			if (if_entry['ifAdminStatus'] != 1)
				continue;
				
			var mac = SncMACAddress.getMACAddressInstance(if_entry['ifPhysAddress']);
			if (mac)
				mac = '' + mac.toString();
					
			var interfaceIndex = if_entry['ifIndex'];
			var interfaceName = if_entry['ifDescr'];
					
			var ipAddresses = []; // If there are no IPv4 addresses, then skip the interface...
			if (!this._findIPv4Addresses(ips, interfaceIndex, ipAddresses))			
				continue;
	
			this._findIPv6Addresses(ipv6s, interfaceIndex, ipAddresses);        
			
			this.addNIC(ipAddresses, mac, interfaceName);
		}
		
	},
	
    _findIPv4Addresses: function(ips, interfaceIndex, ipAddresses) {
        var result = false;

        for (var i in ips) {
            var ip_entry = ips[i];
            if (ip_entry['ipAdEntIfIndex'] != interfaceIndex)
                continue;
                
            var ip = ip_entry['ipAdEntAddr'];

            if (ip)
                ip = '' + ip.toString();
			
            if (!GlideIPAddressUtil.isValidNicIP(ip))
                continue;
            
            var mask = ip_entry['ipAdEntNetMask'];       
            if (mask)
                mask = '' + mask.toString();
                
            var ipObj = {};
            ipObj.ip_address = ip;
            ipObj.netmask = mask;
            ipObj.ip_version = '4';
            ipAddresses.push(ipObj);
            result = true;            
        }
     
        return result
    },
    
    _findIPv6Addresses: function(ipv6s, interfaceIndex, ipAddresses) {
        for (var i in ipv6s) {
            var ip_entry = ipv6s[i];
            
            var parts = new RegExp("^\.(.+?)\.(.*)$").exec(ip_entry['@instance']);
            if (JSUtil.nil(parts))
                continue;
                
            var nicIndex = parts[1];
            var decimalDottedIPv6 = parts[2];

            if (nicIndex != interfaceIndex)
                continue;
              
            var ip = SncIPAddressV6.getDottedDecimal(decimalDottedIPv6);
            if (!ip)
                continue;
            
            var mask = ip_entry['ipv6AddrPfxLength'];       
            if (mask)
                mask = '' + mask.toString();
                
            var ipObj = {};
            ipObj.ip_address = ip;
            ipObj.netmask = mask;
            ipObj.ip_version = '6';
            ipAddresses.push(ipObj);  
        }
    },
    
    addNIC: function(ipAddresses, mac, name) {        
        var nic = {};
        nic[ 'name'        ] = name;
        nic[ 'ip_address'  ] = (ipAddresses.length > 0) ? ipAddresses[0].ip_address : null;
        nic[ 'netmask'     ] = (ipAddresses.length > 0) ? ipAddresses[0].netmask : null;
        nic[ 'mac_address' ] = mac ? mac: null;
        nic[ 'ip_addresses'] = ipAddresses;
        
        this.nics.addRec(nic);
    },
    
	addSerial: function(type, serial) { 	
        // just bail out if we don't have anything here...
        if ((serial == null) || (typeof serial == 'undefined') || gs.nil(serial))
            return;
        
        // if this is the first serial we've seen, record it in the base ci...
        var ci_serial = this.ciData.getData()['serial_number'];
        if ((ci_serial == null) || (typeof ci_serial == 'undefined'))
            this.ciData.getData()['serial_number'] = serial;
        
        // and add it to our serial number list...
        var sr = {};
        sr[ 'serial_number_type' ] = type;
        sr[ 'serial_number' ]      = serial;
        sr[ 'valid' ]              = true;
        this.serials.addRec(sr);
    },
	
    type: 'SnmpIdentityInfoParser'
}