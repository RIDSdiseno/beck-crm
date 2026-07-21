import React, { useState } from "react";
import { Alert, Button, Modal, Upload } from "antd";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { FilePdfOutlined, InboxOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";

const { Dragger } = Upload;

const MSG_PDF_NO_TEXTO =
  "El PDF no contiene texto extraíble. Solicitar archivo Excel o PDF generado desde tabla, no escaneado.";

type ImportarPdfModalProps<TResult> = {
  open: boolean;
  titulo: string;
  onClose: () => void;
  onImportado: () => void;
  importar: (file: File) => Promise<TResult>;
  renderResultado: (result: TResult) => React.ReactNode;
};

function ImportarPdfModal<TResult>({
  open,
  titulo,
  onClose,
  onImportado,
  importar,
  renderResultado,
}: ImportarPdfModalProps<TResult>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<TResult | null>(null);
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
      setError("Selecciona un archivo PDF primero.");
      return;
    }
    console.log("[ImportarPdfModal] selectedFile:", selectedFile, "instanceof File:", selectedFile instanceof File);
    setLoading(true);
    setResultado(null);
    setError(null);
    try {
      const data = await importar(selectedFile);
      setResultado(data);
      onImportado();
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      if (axiosErr?.response?.status === 422) {
        setError(MSG_PDF_NO_TEXTO);
      } else {
        const msg =
          axiosErr?.response?.data?.message ||
          axiosErr?.response?.data?.error ||
          (err instanceof Error ? err.message : null) ||
          "Ocurrió un error al importar el PDF.";
        setError(msg);
      }
      console.error("[ImportarPdfModal] Error al importar:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <span>
          <FilePdfOutlined className="mr-2 text-firemat-primary" />
          {titulo}
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
      width={520}
      destroyOnClose
      afterClose={resetState}
    >
      {!resultado ? (
        <div className="space-y-4 py-2">
          <Dragger
            accept=".pdf"
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
              return false; // impide la subida automática
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
            <p className="ant-upload-text">Haz clic o arrastra el PDF aquí</p>
            <p className="ant-upload-hint">Solo archivos .pdf · Máximo 20 MB</p>
          </Dragger>

          {error && <Alert type="error" showIcon message={error} />}
        </div>
      ) : (
        <div className="py-2">{renderResultado(resultado)}</div>
      )}
    </Modal>
  );
}

export default ImportarPdfModal;
