import { Button, Empty, Image, Select, Segmented, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { api, type Community, type Listing } from './api';
import { MortgageCalculator } from './MortgageCalculator';

type Props = { community: Community };

export function PropertyBrowser({ community }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [type, setType] = useState<'sale' | 'rent'>('sale');
  const [buildingNumber, setBuildingNumber] = useState<string>();
  const [unitNumber, setUnitNumber] = useState<string>();
  const [floor, setFloor] = useState<number>();
  const [roomId, setRoomId] = useState<string>();
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => { void api.listings(community.id).then(setListings).catch(() => setListings([])); }, [community.id]);
  const typed = useMemo(() => listings.filter((item) => item.type === type), [listings, type]);
  const buildings = [...new Set(typed.map((item) => item.buildingNumber))];
  const selectedBuilding = buildings.includes(buildingNumber ?? '') ? buildingNumber : buildings[0];
  const buildingListings = typed.filter((item) => item.buildingNumber === selectedBuilding);
  const buildingDefault = buildingListings.find((item) => item.roomId === item.defaultRoomId);
  const units = [...new Set(typed.filter((item) => item.buildingNumber === selectedBuilding).map((item) => item.unitNumber))];
  const selectedUnit = units.includes(unitNumber ?? '') ? unitNumber : buildingDefault?.unitNumber ?? units[0];
  const floors = [...new Set(typed.filter((item) => item.buildingNumber === selectedBuilding && item.unitNumber === selectedUnit).map((item) => item.floor))].sort((a, b) => a - b);
  const selectedFloor = floors.includes(floor ?? -1) ? floor : buildingDefault && buildingDefault.unitNumber === selectedUnit ? buildingDefault.floor : floors[0];
  const availableRooms = typed.filter((item) => item.buildingNumber === selectedBuilding && item.unitNumber === selectedUnit && item.floor === selectedFloor);
  const defaultRoom = availableRooms.find((item) => item.roomId === item.defaultRoomId);
  const selectedRoom = availableRooms.find((item) => item.roomId === roomId) ?? defaultRoom ?? availableRooms[0];
  const age = Math.max(0, new Date().getFullYear() - Number(community.deliveryDate.slice(0, 4)));

  return <div className="property-browser">
    <h3>房源信息</h3>
    <Segmented block value={type} onChange={(value) => { setType(value as 'sale' | 'rent'); setBuildingNumber(undefined); setUnitNumber(undefined); setFloor(undefined); setRoomId(undefined); }}
      options={[{ label: '售房', value: 'sale' }, { label: '租房', value: 'rent' }]} />
    {typed.length === 0 ? <Empty description={`暂无${type === 'sale' ? '在售' : '在租'}房源`} /> : <>
      <div className="property-selectors">
        <Select value={selectedBuilding} onChange={(value) => { setBuildingNumber(value); setUnitNumber(undefined); setFloor(undefined); setRoomId(undefined); }} options={buildings.map((value) => ({ value, label: `${value} 幢` }))} />
        <Select value={selectedUnit} onChange={(value) => { setUnitNumber(value); setFloor(undefined); setRoomId(undefined); }} options={units.map((value) => ({ value, label: `${value} 单元` }))} />
        <Select value={selectedFloor} onChange={(value) => { setFloor(value); setRoomId(undefined); }} options={floors.map((value) => ({ value, label: `${value} 层` }))} />
        <Select value={selectedRoom?.roomId} onChange={setRoomId} options={availableRooms.map((item) => ({ value: item.roomId, label: `${item.roomNumber} 室` }))} />
      </div>
      {selectedRoom && <div className="property-detail">
        <div className="property-price">{selectedRoom.type === 'sale' ? `${selectedRoom.price} 万元` : `${selectedRoom.price} 元/月`}</div>
        <Space wrap><Tag>{selectedRoom.area} ㎡</Tag><Tag>{selectedRoom.bedrooms} 室 {selectedRoom.livingRooms} 厅</Tag>
          <Tag>{selectedRoom.floor} / {selectedRoom.totalFloors} 层</Tag><Tag>{selectedRoom.decoration}</Tag><Tag>房龄约 {age} 年</Tag></Space>
        <div className="property-photos"><Image.PreviewGroup>
          {selectedRoom.mainMediaId && <Image src={`/api/media/${selectedRoom.mainMediaId}`} alt="房源主图" />}
          {selectedRoom.detailMediaIds.map((id, index) => <Image key={id} src={`/api/media/${id}`} alt={`详情图 ${index + 1}`} />)}
          {selectedRoom.floorplanMediaId && <Image src={`/api/media/${selectedRoom.floorplanMediaId}`} alt="户型图" />}
        </Image.PreviewGroup></div>
        <Typography.Text type="secondary">挂牌信息仅供参考，以实际房源与交易条件为准。</Typography.Text>
        {selectedRoom.type === 'sale' && <div className="calculator-action"><Button onClick={() => setCalculatorOpen(true)}>计算月供</Button>
          <MortgageCalculator key={selectedRoom.id} open={calculatorOpen} onClose={() => setCalculatorOpen(false)} salePriceWan={selectedRoom.price} /></div>}
      </div>}
    </>}
  </div>;
}
