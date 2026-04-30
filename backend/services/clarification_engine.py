from __future__ import annotations

from models import Answer, ClarificationQuestion, Topology
from services.validator import validate_topology


def build_questions(topology: Topology) -> list[ClarificationQuestion]:
    questions: list[ClarificationQuestion] = []
    for device in topology.devices:
        if device.type == "unknown":
            questions.append(
                ClarificationQuestion(
                    id=f"q-device-type-{device.id}",
                    type="unknown_device_type",
                    message=f'Device "{device.name}" has an unknown type. What should it be classified as?',
                    suggested_answer="server",
                    entity_id=device.id,
                    options=["firewall", "router", "switch", "server", "storage", "pdu", "other"],
                )
            )

    for cable in topology.cables:
        if not cable.sourcePort:
            questions.append(
                ClarificationQuestion(
                    id=f"q-source-port-{cable.id}",
                    type="missing_source_port",
                    message=f"Which source port should be used for connection {cable.id}?",
                    suggested_answer="eth1",
                    entity_id=cable.id,
                )
            )
        if not cable.targetPort:
            questions.append(
                ClarificationQuestion(
                    id=f"q-target-port-{cable.id}",
                    type="missing_target_port",
                    message=f"Which destination port should be used for connection {cable.id}?",
                    suggested_answer="Gi1/0/1",
                    entity_id=cable.id,
                )
            )
        if cable.cableType == "unknown":
            questions.append(
                ClarificationQuestion(
                    id=f"q-cable-type-{cable.id}",
                    type="unknown_cable_type",
                    message=f"What cable type should be used for connection {cable.id}?",
                    suggested_answer="ethernet",
                    entity_id=cable.id,
                    options=["ethernet", "fiber", "wan", "management", "storage", "power", "unknown"],
                )
            )
    return questions


def apply_answers(topology: Topology, answers: list[Answer]) -> Topology:
    answer_map = {answer.question_id: answer.answer.strip() for answer in answers if answer.answer.strip()}
    for device in topology.devices:
        answer = answer_map.get(f"q-device-type-{device.id}")
        if answer:
            device.type = answer.lower().replace(" ", "_")

    for cable in topology.cables:
        source_answer = answer_map.get(f"q-source-port-{cable.id}")
        target_answer = answer_map.get(f"q-target-port-{cable.id}")
        cable_type_answer = answer_map.get(f"q-cable-type-{cable.id}")
        if source_answer:
            cable.sourcePort = source_answer
        if target_answer:
            cable.targetPort = target_answer
        if cable_type_answer:
            cable.cableType = cable_type_answer.lower()
        cable.label = _cable_label(topology, cable.sourceDeviceId, cable.sourcePort, cable.targetDeviceId, cable.targetPort)
    topology.issues = [issue for issue in topology.issues if not _answered(issue, answer_map)]
    return validate_topology(topology)


def _cable_label(topology: Topology, source_id: str, source_port: str | None, target_id: str, target_port: str | None) -> str:
    names = {device.id: device.name for device in topology.devices}
    source = names.get(source_id, source_id)
    target = names.get(target_id, target_id)
    return f"{source} {source_port or '?'} -> {target} {target_port or '?'}"


def _answered(issue, answer_map: dict[str, str]) -> bool:
    if not issue.entity_id:
        return False
    candidates = [
        f"q-device-type-{issue.entity_id}",
        f"q-source-port-{issue.entity_id}",
        f"q-target-port-{issue.entity_id}",
        f"q-cable-type-{issue.entity_id}",
    ]
    return any(candidate in answer_map for candidate in candidates)
