import React, { useRef, useEffect, useState } from 'react';
import ToolBar from './ToolBar';
import { Shape } from './Shapes/Shape';
import { Rectangle } from "./Shapes/Rectangle";
import { Ellipse } from "./Shapes/Ellipse";
import { Triangle } from "./Shapes/Triangle";
import { Line } from "./Shapes/Line";
import { ShapeCollection } from './Shapes/ShapeCollection';
import { GeometryUtils } from './GeometryUtils';
import { ShapeUtils } from './Shapes/ShapeUtils';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [shapeCollection, setShapeCollection] = useState<ShapeCollection>(new ShapeCollection());
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandleIndex, setResizeHandleIndex] = useState<number | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [rotationStartAngle, setRotationStartAngle] = useState<number>(0);

  const drawShapes = (ctx: CanvasRenderingContext2D) => {
    shapeCollection.shapes.forEach(shape => {

      if (shape === selectedShape) {
        ctx.save();
        shape.drawSelection(ctx); // Dibuja la figura seleccionada con borde resaltado
        shape.drawResizeHandles(ctx); // Dibuja los "handles" de redimensionamiento
        shape.drawRotationHandle(ctx); // Dibuja el "handle" de rotación
        ctx.restore();

      } else {
        shape.draw(ctx);
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        drawShapes(context);
      }

      if (selectedTool === 'rectangle' || 
          selectedTool === 'ellipse'  || 
          selectedTool === 'triangle' ||
          selectedTool === 'line') 
      {
        canvas.style.cursor = 'crosshair';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  }, [shapeCollection, selectedTool, selectedShape]);

  const handleSelectTool = (tool: string) => {
    setSelectedTool(tool);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const clickX = e.nativeEvent.offsetX;
    const clickY = e.nativeEvent.offsetY;

    // Función auxiliar para manejar la selección de figuras
    const handleShapeSelection = (x: number, y: number) => {
        for (let i = shapeCollection.shapes.length - 1; i >= 0; i--) {
            if (shapeCollection.shapes[i].contains(x, y)) {
                setSelectedShape(shapeCollection.shapes[i]);
                setIsDragging(true);
                setStartX(x);
                setStartY(y);
                setDragOffsetX(x - shapeCollection.shapes[i].x);
                setDragOffsetY(y - shapeCollection.shapes[i].y);
                return true; // Figuras seleccionada
            }
        }
        return false; // Ninguna figura seleccionada
    };

    if (selectedTool === 'select') {
        if (selectedShape) {
          
            if (selectedShape.isOverHandle(clickX, clickY)) {
                // Manejando el redimensionamiento
                setIsResizing(true);
                const handleIndex = selectedShape.getResizeHandles().findIndex(handle => {
                  const rotatedHandle = GeometryUtils.rotatePoint(
                      handle.x,
                      handle.y,
                      selectedShape.x + selectedShape.width / 2,
                      selectedShape.y + selectedShape.height / 2,
                      selectedShape.rotation
                  );
                  return GeometryUtils.pointInRectangle(clickX, clickY, rotatedHandle.x - 5, rotatedHandle.y - 5, 10, 10, 0);
              });
                setResizeHandleIndex(handleIndex);
                return;
            } else if (selectedShape.isOverRotationHandle(clickX, clickY)) {
                // Manejando la rotación
                setIsRotating(true);
                const center = { 
                    x: selectedShape.x + selectedShape.width / 2, 
                    y: selectedShape.y + selectedShape.height / 2 
                };
                setRotationStartAngle(Math.atan2(clickY - center.y, clickX - center.x));
                return;
            }
        }

        // Selección de figuras
        const shapeSelected = handleShapeSelection(clickX, clickY);
        if (!shapeSelected) {
            setSelectedShape(null); // Deseleccionar figura si no se selecciona ninguna
        }

    } else if (['rectangle', 'ellipse', 'triangle', 'line'].includes(selectedTool)) {
        // Comenzar a dibujar una nueva figura
        setIsDrawing(true);
        setStartX(clickX);
        setStartY(clickY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    const context = canvas.getContext('2d');
    if (!context) return;
  
    const currentX = e.nativeEvent.offsetX;
    const currentY = e.nativeEvent.offsetY;

     // Si se está redimensionando
     if (isResizing && selectedShape && resizeHandleIndex !== null) {
      ShapeUtils.resizeShape(selectedShape, resizeHandleIndex, currentX, currentY);
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawShapes(context);
      return;
    }

    if (isRotating && selectedShape) {
      const center = { 
        x: selectedShape.x + selectedShape.width / 2, 
        y: selectedShape.y + selectedShape.height / 2 
      };
      const angle = Math.atan2(currentY - center.y, currentX - center.x);
      const newRotation = angle - rotationStartAngle;
      selectedShape.rotation = (selectedShape.rotation + newRotation) % (2 * Math.PI);
      setRotationStartAngle(angle);

      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          drawShapes(context);
        }
      }
      return;
    }
  
    if (isDrawing && startX !== null && startY !== null) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawShapes(context);
  
      let shape: Shape;
  
      switch (selectedTool) {
        case 'rectangle':
          shape = new Rectangle(startX, startY, currentX - startX, currentY - startY);
          break;
        case 'ellipse':
          shape = new Ellipse(startX, startY, currentX - startX, currentY - startY);
          break;
        case 'triangle':
          shape = new Triangle(startX, startY, currentX - startX, currentY - startY);
          break;
        case 'line':
          shape = new Line(startX, startY, currentX, currentY);
          break;
        default:
          return;
      }
      shape.draw(context);
  
    } else if (selectedTool === 'select' && isDragging && selectedShape) {
      // Movimiento de figuras
      const dx = currentX - startX!;
      const dy = currentY - startY!;
  
      ShapeUtils.translateShape(selectedShape, dx, dy);
  
      setStartX(currentX);
      setStartY(currentY);
  
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawShapes(context);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {

    if (isResizing) {
      setIsResizing(false);  // Terminar el redimensionamiento
      setResizeHandleIndex(null);
      return;
    }

    if (isRotating) {
      setIsRotating(false);
      return;
    }
    
    if (isDrawing) {
      setIsDrawing(false);

      const endX = e.nativeEvent.offsetX;
      const endY = e.nativeEvent.offsetY;

      if (startX !== null && startY !== null) {
        let x = Math.min(startX, endX);
        let y = Math.min(startY, endY);
        let width = Math.abs(endX - startX);
        let height = Math.abs(endY - startY);
        let newShape: Shape;

        switch (selectedTool) {
          case 'rectangle':
            newShape = new Rectangle(x, y, width, height);
            break;
          case 'ellipse':
            newShape = new Ellipse(x, y, width, height);
            break;
          case 'triangle':
            newShape = new Triangle(x, y, width, height);
            break;
          case 'line':
            newShape = new Line(startX, startY, endX, endY); // Crear una línea final
            break;
          default:
            return;
        }
        
        const updatedShapeCollection = shapeCollection;
        updatedShapeCollection.addShape(newShape);

        // Actualizar el estado con la misma instancia
        setShapeCollection(updatedShapeCollection);
        setSelectedShape(null);
      }
    }

    if (isDragging) {
      setIsDragging(false); // Terminar el arrastre
      setStartX(null); // Resetear coordenadas de arrastre
      setStartY(null);
    }
  };

  const saveToJSON = () => {
    const json = shapeCollection.toJSON();
    console.log("Saved JSON:", json);
  };

  const saveToXML = () => {
    const xml = shapeCollection.toXML();
    console.log("Saved XML:", xml);
  };

  return (
    <div>
      <ToolBar onSelectTool={handleSelectTool} />
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        style={{ border: '1px solid #000' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <button onClick={saveToJSON}>Save to JSON</button>
      <button onClick={saveToXML}>Save to XML</button>
    </div>
  );
}