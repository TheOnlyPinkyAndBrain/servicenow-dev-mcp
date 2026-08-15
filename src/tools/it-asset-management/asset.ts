import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";

export function registerAssetTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_asset_list",
    "List IT assets (alm_asset) with filters for status, model, location, assigned_to",
    {
      asset_tag: z.string().optional().describe("Asset tag (contains match)"),
      serial_number: z.string().optional().describe("Serial number (exact match)"),
      model: z.string().optional().describe("Model name (contains match)"),
      model_category: z.string().optional().describe("Model category name (contains match)"),
      install_status: z.string().optional().describe("Install status: 1=In use, 2=On order, 6=In stock, 7=Retired, 8=Disposed"),
      substatus: z.string().optional().describe("Substatus value"),
      assigned_to: z.string().optional().describe("Assigned to user name (contains match)"),
      location: z.string().optional().describe("Location name (contains match)"),
      sys_class_name: z.string().optional().describe("Asset class: alm_asset, alm_hardware, alm_consumable, alm_license"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ asset_tag, serial_number, model, model_category, install_status, substatus, assigned_to, location, sys_class_name, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (asset_tag) qp.push(`asset_tagLIKE${asset_tag}`);
        if (serial_number) qp.push(`serial_number=${serial_number}`);
        if (model) qp.push(`model.nameLIKE${model}`);
        if (model_category) qp.push(`model_category.nameLIKE${model_category}`);
        if (install_status) qp.push(`install_status=${install_status}`);
        if (substatus) qp.push(`substatus=${substatus}`);
        if (assigned_to) qp.push(`assigned_to.nameLIKE${assigned_to}`);
        if (location) qp.push(`location.nameLIKE${location}`);
        if (sys_class_name) qp.push(`sys_class_name=${sys_class_name}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("alm_asset", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,asset_tag,display_name,serial_number,model,model_category,install_status,substatus,assigned_to,location,cost,sys_class_name,ci,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_asset_get",
    "Get full asset details including related CI, contracts, and consumables",
    {
      sys_id: z.string().describe("Asset sys_id"),
    },
    async ({ sys_id }) => {
      try {
        const asset = await client.getById("alm_asset", sys_id);
        return jsonResult(asset);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_hardware_list",
    "List hardware assets (alm_hardware) — servers, workstations, network devices, etc.",
    {
      model: z.string().optional().describe("Model name (contains match)"),
      serial_number: z.string().optional().describe("Serial number"),
      install_status: z.string().optional().describe("Install status"),
      assigned_to: z.string().optional().describe("Assigned to user (contains match)"),
      location: z.string().optional().describe("Location (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ model, serial_number, install_status, assigned_to, location, limit }) => {
      try {
        const qp: string[] = [];
        if (model) qp.push(`model.nameLIKE${model}`);
        if (serial_number) qp.push(`serial_number=${serial_number}`);
        if (install_status) qp.push(`install_status=${install_status}`);
        if (assigned_to) qp.push(`assigned_to.nameLIKE${assigned_to}`);
        if (location) qp.push(`location.nameLIKE${location}`);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("alm_hardware", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,asset_tag,display_name,serial_number,model,model_category,install_status,substatus,assigned_to,location,warranty_expiration,ci,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_license_list",
    "List software licenses (alm_license) — entitlements, compliance status, counts",
    {
      software_model: z.string().optional().describe("Software model name (contains match)"),
      license_type: z.string().optional().describe("License type"),
      install_status: z.string().optional().describe("Install status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ software_model, license_type, install_status, query, limit }) => {
      try {
        const qp: string[] = [];
        if (software_model) qp.push(`model.nameLIKE${software_model}`);
        if (license_type) qp.push(`license_type=${license_type}`);
        if (install_status) qp.push(`install_status=${install_status}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("alm_license", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,display_name,model,license_type,rights,install_status,assigned_to,start_date,end_date,cost,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_software_install_list",
    "List software installations detected on CIs (cmdb_sam_sw_install)",
    {
      installed_on: z.string().optional().describe("CI sys_id to check installations for"),
      software_name: z.string().optional().describe("Software display name (contains match)"),
      publisher: z.string().optional().describe("Publisher name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ installed_on, software_name, publisher, limit }) => {
      try {
        const qp: string[] = [];
        if (installed_on) qp.push(`installed_on=${installed_on}`);
        if (software_name) qp.push(`display_nameLIKE${software_name}`);
        if (publisher) qp.push(`publisherLIKE${publisher}`);
        qp.push("ORDERBYdisplay_name");

        const result = await client.query("cmdb_sam_sw_install", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,display_name,installed_on,version,publisher,install_date,last_scan_date,is_reconciled,norm_product",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_model_list",
    "List product/asset models (cmdb_model) — hardware models, software models, consumable models",
    {
      name: z.string().optional().describe("Model name (contains match)"),
      model_category: z.string().optional().describe("Model category name (contains match)"),
      manufacturer: z.string().optional().describe("Manufacturer name (contains match)"),
      sys_class_name: z.string().optional().describe("Model class (cmdb_model, cmdb_hardware_product_model, cmdb_software_product_model)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ name, model_category, manufacturer, sys_class_name, limit }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (model_category) qp.push(`cmdb_model_category.nameLIKE${model_category}`);
        if (manufacturer) qp.push(`manufacturer.nameLIKE${manufacturer}`);
        if (sys_class_name) qp.push(`sys_class_name=${sys_class_name}`);
        qp.push("ORDERBYname");

        const result = await client.query("cmdb_model", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,manufacturer,cmdb_model_category,model_number,short_description,sys_class_name,cost,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_asset_create",
    "Create a new asset record",
    {
      model: z.string().describe("Model sys_id"),
      serial_number: z.string().optional().describe("Serial number"),
      asset_tag: z.string().optional().describe("Asset tag"),
      assigned_to: z.string().optional().describe("Assigned to user sys_id"),
      location: z.string().optional().describe("Location sys_id"),
      install_status: z.string().optional().describe("Install status"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    async ({ model, serial_number, asset_tag, assigned_to, location, install_status, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { model, ...additional_fields };
        if (serial_number) body.serial_number = serial_number;
        if (asset_tag) body.asset_tag = asset_tag;
        if (assigned_to) body.assigned_to = assigned_to;
        if (location) body.location = location;
        if (install_status) body.install_status = install_status;
        const result = await client.create("alm_asset", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_asset_update",
    "Update an existing asset record",
    {
      sys_id: z.string().describe("Asset sys_id"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("alm_asset", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
