import React, { useState } from "react";
import { Alert, Button, Descriptions, Modal, Tag, Upload } from "antd";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { FileExcelOutlined, InboxOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import {
  firematInventarioAPI,
  type ImportarExcelInventarioResult,
} from "../../services/api";

const { Dragger } = Upload;

type ImportarExcelInventarioModalProps = {
  open: boolean;
  onClose: () => void;
  onImportado: () => void;
};

const ResultadoImportExcel: React.FC<{ result: ImportarExcelInventarioResult }> = ({
  result,
}) => (
  <div className="space-y-3">
    <Descriptions column={2} size="small" bordered>
      <Descriptions.Item label="Filas en el archivo">{result.totalFilas}</Descriptions.Item>
      <Descriptions.Item label="Actualizados">
        <Tag color="green">{result.actualizados}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="No encontrados">
        <Tag color={result.noEncontrados > 0 ? "orange" : "default"}>{result.noEncontrados}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Omitidos">
        <Tag color={result.omitidos > 0 ? "orange" : "default"}>{result.omitidos}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Sin SKU">
        <Tag color={result.sinSku > 0 ? "orange" : "default"}>{result.sinSku}</Tag>
      </Descriptions.Item>
    </Descriptions>

    {result.advertencias && result.advertencias.length > 0 && (
      <Alert
        type="warning"
        showIcon
        message="Advertencias"
        description={
          <ul className="list-disc pl-4 max-h-48 overflow-y-auto">
            {result.advertencias.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        }
      />
    )}

    {result.errores.length > 0 && (
      <Alert
        type="error"
        showIcon
        message="Errores"
        description={
          <ul className="list-disc pl-4 max-h-48 overflow-y-auto">
            {result.errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        }
      />
    )}
  </div>
);

const ImportarExcelInventarioModal: React.FC<ImportarExcelInventarioModalProps> = ({
  open,
  onClose,
  onImportado,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ImportarExcelInventarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setFileList([]);
    setResultado(null);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImportar = async () => {
    if (!selectedFile) {
      setError("Selecciona un archivo Excel primero.");
      return;
    }
    setLoading(true);
    setResultado(null);
    setError(null);
    try {
      const data = await firematInventarioAPI.importarInventarioExcel(selectedFile);
      setResultado(data);
      onImportado();
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      const msg =
        axiosErr?.response?.data?.error ||
        axiosErr?.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        "Ocurrió un error al importar el Excel.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <span>
          <FileExcelOutlined className="mr-2 text-firemat-primary" />
          Importar stock desde Excel
        </span>
      }
      onCancel={handleClose}
      footer={
        resultado ? (
          <Button onClick={handleClose} className="firemat-action-button">
            Cerrar
          </Button>
        ) : (
          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="primary"
              className="firemat-action-button"
              onClick={() => void handleImportar()}
              loading={loading}
              disabled={!selectedFile}
            >
              Importar
            </Button>
          </div>
        )
      }
      width={560}
      destroyOnClose
      afterClose={resetState}
    >
      {!resultado ? (
        <div className="space-y-4 py-2">
          <Dragger
            accept=".xlsx,.xls"
            maxCount={1}
            fileList={fileList}
            beforeUpload={(file: RcFile) => {
              setSelectedFile(file);
              setFileList([
                {
                  uid: file.uid,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  status: "done",
                  originFileObj: file,
                },
              ]);
              setError(null);
              return false;
            }}
            onRemove={() => {
              setSelectedFile(null);
              setFileList([]);
              setError(null);
            }}
            disabled={loading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: "#e63c1e" }} />
            </p>
            <p className="ant-upload-text">Haz clic o arrastra el Excel aquí</p>
            <p className="ant-upload-hint">
              Columnas esperadas: SKU y Stock inicial · Solo .xlsx/.xls · Máximo 20 MB
            </p>
          </Dragger>

          {error && <Alert type="error" showIcon message={error} />}
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto py-2">
          <ResultadoImportExcel result={resultado} />
        </div>
      )}
    </Modal>
  );
};

export default ImportarExcelInventarioModal;
